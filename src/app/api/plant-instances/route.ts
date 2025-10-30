import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { PlantInstanceQueries } from '@/lib/db/queries/plant-instances';
import { createPlantInstanceSchema, plantInstanceFilterSchema, type EnhancedPlantInstanceFilter } from '@/lib/validation/plant-schemas';
import { validateVerifiedRequest } from '@/lib/auth/server';

// Helper function to transform S3 keys to CloudFront URLs
function transformS3KeysToCloudFrontUrls(instance: any): void {
  if (instance.s3ImageKeys && instance.s3ImageKeys.length > 0) {
    const cloudFrontDomain = process.env.NEXT_PUBLIC_CLOUDFRONT_DOMAIN;
    if (cloudFrontDomain) {
      instance.images = instance.s3ImageKeys.map(
        (key: string) => `https://${cloudFrontDomain}/${key}`
      );
      instance.primaryImage = instance.images[0];
    }
  }
}

// GET /api/plant-instances - Get plant instances with optional filtering
export async function GET(request: NextRequest) {
  try {
    const authResult = await validateVerifiedRequest();
    if (!authResult.user) {
      return NextResponse.json({ 
        success: false,
        error: authResult.error 
      }, { status: authResult.error === 'Email verification required' ? 403 : 401 });
    }
    
    const { user } = authResult;

    const { searchParams } = new URL(request.url);
    
    // Parse filter parameters
    const filterParams = {
      userId: user.id,
      location: searchParams.get('location') || undefined,
      plantId: searchParams.get('plantId') ? parseInt(searchParams.get('plantId')!, 10) : undefined,
      isActive: searchParams.get('isActive') ? searchParams.get('isActive') === 'true' : undefined,
      overdueOnly: searchParams.get('overdueOnly') === 'true',
      dueSoonDays: searchParams.get('dueSoonDays') ? parseInt(searchParams.get('dueSoonDays')!, 10) : undefined,
      createdAfter: searchParams.get('createdAfter') ? new Date(searchParams.get('createdAfter')!) : undefined,
      createdBefore: searchParams.get('createdBefore') ? new Date(searchParams.get('createdBefore')!) : undefined,
      lastFertilizedAfter: searchParams.get('lastFertilizedAfter') ? new Date(searchParams.get('lastFertilizedAfter')!) : undefined,
      lastFertilizedBefore: searchParams.get('lastFertilizedBefore') ? new Date(searchParams.get('lastFertilizedBefore')!) : undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 20,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!, 10) : 0,
    };

    // Validate filter parameters
    const validatedFilters = plantInstanceFilterSchema.parse(filterParams);
    
    // Get sorting parameters (not part of the schema but needed for the query)
    const sortBy = (searchParams.get('sortBy') as any) || 'created_at';
    const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc';
    
    // Check if we need custom sorting (different from default)
    const needsCustomSorting = sortBy !== 'created_at' || sortOrder !== 'desc';
    
    console.log('Plant instances API:', { 
      userId: user.id, 
      sortBy, 
      sortOrder, 
      needsCustomSorting,
      filterCount: Object.keys(validatedFilters).length 
    });
    
    let result;
    if (needsCustomSorting) {
      // Use enhanced search for custom sorting
      const enhancedFilters: EnhancedPlantInstanceFilter = {
        ...validatedFilters,
        sortBy,
        sortOrder,
        includeStats: false,
        includeFacets: false,
      };
      result = await PlantInstanceQueries.enhancedSearch(enhancedFilters);
    } else {
      // Use regular filtering for default sorting
      result = await PlantInstanceQueries.getWithFilters(validatedFilters);
    }
    
    console.log('Plant instances result:', {
      instanceCount: result.instances.length,
      totalCount: result.totalCount,
      hasMore: result.hasMore
    });

    // Transform S3 keys to CloudFront URLs
    result.instances.forEach(transformS3KeysToCloudFrontUrls);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to get plant instances:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

// POST /api/plant-instances - Create a new plant instance
export async function POST(request: NextRequest) {
  try {
    const authResult = await validateVerifiedRequest();
    if (!authResult.user) {
      return NextResponse.json({ 
        success: false,
        error: authResult.error 
      }, { status: authResult.error === 'Email verification required' ? 403 : 401 });
    }
    
    const { user } = authResult;

    // Check if request is FormData or JSON
    const contentType = request.headers.get('content-type');
    let body: Record<string, unknown>;
    
    if (contentType?.includes('multipart/form-data')) {
      // Handle FormData (for file uploads)
      const formData = await request.formData();
      body = {};
      
      // Helper function to convert file to base64
      const fileToBase64 = async (file: File): Promise<string> => {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const base64 = buffer.toString('base64');
        return `data:${file.type};base64,${base64}`;
      };

      const imageFiles: File[] = [];
      const existingImages: string[] = [];
      
      // Extract form fields
      for (const [key, value] of formData.entries()) {
        if (key.startsWith('imageFiles[')) {
          // Handle new image files
          if (value instanceof File) {
            imageFiles.push(value);
          }
        } else if (key.startsWith('existingImages[')) {
          // Handle existing images
          existingImages.push(value as string);
        } else {
          // Convert form values to appropriate types
          if (key === 'plantId') {
            body[key] = parseInt(value as string, 10);
          } else if (key === 'isActive') {
            body[key] = value === 'true';
          } else {
            body[key] = value;
          }
        }
      }

      // Convert new image files to base64
      const newImageBase64s = await Promise.all(
        imageFiles.map(file => fileToBase64(file))
      );

      // Combine existing images with new images
      body.images = [...existingImages, ...newImageBase64s];
    } else {
      // Handle JSON
      try {
        body = await request.json();
        if (!body || Object.keys(body).length === 0) {
          return NextResponse.json(
            { 
              success: false,
              error: 'Request body is required' 
            },
            { status: 400 }
          );
        }
      } catch {
        return NextResponse.json(
          { 
            success: false,
            error: 'Invalid JSON in request body' 
          },
          { status: 400 }
        );
      }
    }
    
    // Add user ID to the request body and convert date strings to Date objects
    const instanceData = {
      ...body,
      userId: user.id,
      // Convert date strings to Date objects if they exist and are not empty
      lastFertilized: body.lastFertilized && body.lastFertilized !== '' ? new Date(body.lastFertilized as string) : null,
      lastRepot: body.lastRepot && body.lastRepot !== '' ? new Date(body.lastRepot as string) : null,
    };

    // Validate the plant instance data
    let validatedData;
    try {
      validatedData = createPlantInstanceSchema.parse(instanceData);
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        return NextResponse.json(
          { 
            success: false,
            error: 'Validation failed',
            details: validationError.issues
          },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { 
          success: false,
          error: 'Validation failed',
          details: validationError instanceof Error ? validationError.message : 'Invalid data'
        },
        { status: 400 }
      );
    }
    
    // Calculate initial fertilizer due date if schedule is provided
    if (validatedData.fertilizerSchedule && !validatedData.fertilizerDue) {
      const now = new Date();
      const scheduleMatch = validatedData.fertilizerSchedule.match(/(\d+)\s*(day|week|month)s?/i);
      
      if (scheduleMatch) {
        const [, amount, unit] = scheduleMatch;
        const dueDate = new Date(now);
        
        switch (unit.toLowerCase()) {
          case 'day':
            dueDate.setDate(dueDate.getDate() + parseInt(amount, 10));
            break;
          case 'week':
            dueDate.setDate(dueDate.getDate() + (parseInt(amount, 10) * 7));
            break;
          case 'month':
            dueDate.setMonth(dueDate.getMonth() + parseInt(amount, 10));
            break;
        }
        
        validatedData.fertilizerDue = dueDate;
      }
    }

    // Create the plant instance
    const plantInstance = await PlantInstanceQueries.create(validatedData);

    // Get the enhanced plant instance with plant data
    const enhancedInstance = await PlantInstanceQueries.getEnhancedById(plantInstance.id);

    // Transform S3 keys to CloudFront URLs
    if (enhancedInstance) {
      transformS3KeysToCloudFrontUrls(enhancedInstance);
    }

    return NextResponse.json({
      success: true,
      data: enhancedInstance
    }, { status: 201 });
  } catch (error) {
    console.error('Failed to create plant instance:', error);
    
    if (error instanceof Error && error.message.includes('validation')) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid plant instance data', 
          details: error.message 
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to create plant instance' 
      },
      { status: 500 }
    );
  }
}