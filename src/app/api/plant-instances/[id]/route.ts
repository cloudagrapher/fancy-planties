import { NextRequest, NextResponse } from 'next/server';
import { PlantInstanceQueries } from '@/lib/db/queries/plant-instances';
import { updatePlantInstanceSchema } from '@/lib/validation/plant-schemas';
import { validateRequest } from '@/lib/auth/server';

// GET /api/plant-instances/[id] - Get a specific plant instance
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid plant instance ID' }, { status: 400 });
    }

    const plantInstance = await PlantInstanceQueries.getEnhancedById(id);
    
    if (!plantInstance) {
      return NextResponse.json({ error: 'Plant instance not found' }, { status: 404 });
    }

    // Check if the plant instance belongs to the current user
    if (plantInstance.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(plantInstance);
  } catch (error) {
    console.error('Failed to get plant instance:', error);
    return NextResponse.json(
      { error: 'Failed to get plant instance' },
      { status: 500 }
    );
  }
}

// PUT /api/plant-instances/[id] - Update a plant instance
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid plant instance ID' }, { status: 400 });
    }

    // Check if the plant instance exists and belongs to the user
    const existingInstance = await PlantInstanceQueries.getEnhancedById(id);
    if (!existingInstance) {
      return NextResponse.json({ error: 'Plant instance not found' }, { status: 404 });
    }

    if (existingInstance.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if request is FormData or JSON
    const contentType = request.headers.get('content-type');
    let body: any;
    
    if (contentType?.includes('multipart/form-data')) {
      // Handle FormData for file uploads
      const formData = await request.formData();
      
      // Helper function to convert file to base64
      const fileToBase64 = async (file: File): Promise<string> => {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const base64 = buffer.toString('base64');
        return `data:${file.type};base64,${base64}`;
      };

      // Extract form fields
      body = {};
      const imageFiles: File[] = [];
      const existingImages: (string | FormDataEntryValue)[] = [];
      
      for (const [key, value] of formData.entries()) {
        if (key.startsWith('existingImages[')) {
          // Handle existing images array
          existingImages.push(value);
        } else if (key.startsWith('imageFiles[')) {
          // Handle new image files
          if (value instanceof File) {
            imageFiles.push(value);
          }
        } else {
          // Handle regular form fields
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
      } catch (jsonError) {
        return NextResponse.json(
          { error: 'Invalid request format' },
          { status: 400 }
        );
      }
    }
    
    // Convert date strings to Date objects if they exist and are not empty
    const processedBody = {
      ...body,
      lastFertilized: body.lastFertilized && body.lastFertilized !== '' ? new Date(body.lastFertilized) : null,
      lastRepot: body.lastRepot && body.lastRepot !== '' ? new Date(body.lastRepot) : null,
    };
    
    // Validate the update data
    const updateData = updatePlantInstanceSchema.parse({
      ...processedBody,
      id,
      userId: user.id,
    });

    // Remove id and userId from update data as they shouldn't be updated
    const { id: _, userId: __, ...dataToUpdate } = updateData;

    // Update the plant instance
    const updatedInstance = await PlantInstanceQueries.update(id, dataToUpdate);
    
    // Get the enhanced plant instance with plant data
    const enhancedInstance = await PlantInstanceQueries.getEnhancedById(updatedInstance.id);
    
    return NextResponse.json(enhancedInstance);
  } catch (error) {
    console.error('Failed to update plant instance:', error);
    
    if (error instanceof Error && error.message.includes('validation')) {
      return NextResponse.json(
        { error: 'Invalid plant instance data', details: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to update plant instance' },
      { status: 500 }
    );
  }
}

// DELETE /api/plant-instances/[id] - Delete a plant instance
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid plant instance ID' }, { status: 400 });
    }

    // Check if the plant instance exists and belongs to the user
    const existingInstance = await PlantInstanceQueries.getEnhancedById(id);
    if (!existingInstance) {
      return NextResponse.json({ error: 'Plant instance not found' }, { status: 404 });
    }

    if (existingInstance.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete the plant instance
    const deleted = await PlantInstanceQueries.delete(id);
    
    if (!deleted) {
      return NextResponse.json({ error: 'Failed to delete plant instance' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Plant instance deleted successfully' });
  } catch (error) {
    console.error('Failed to delete plant instance:', error);
    return NextResponse.json(
      { error: 'Failed to delete plant instance' },
      { status: 500 }
    );
  }
}