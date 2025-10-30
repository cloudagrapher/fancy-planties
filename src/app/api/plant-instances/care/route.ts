import { NextRequest, NextResponse } from 'next/server';
import { PlantInstanceQueries } from '@/lib/db/queries/plant-instances';
import { logFertilizerSchema, logRepotSchema } from '@/lib/validation/plant-schemas';
import { validateRequest } from '@/lib/auth/server';
import { S3ImageService } from '@/lib/services/s3-image-service';

// Helper function to transform S3 keys to image URLs
// Uses proxy in development, direct CloudFront in production (with custom domain)
function transformS3KeysToCloudFrontUrls(instance: any): void {
  if (instance.s3ImageKeys && instance.s3ImageKeys.length > 0) {
    instance.images = S3ImageService.s3KeysToCloudFrontUrls(instance.s3ImageKeys);
    instance.primaryImage = instance.images[0];
  }
}

// POST /api/plant-instances/care - Log care activities (fertilizer, repot)
export async function POST(request: NextRequest) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, ...data } = body;

    if (!action) {
      return NextResponse.json({ error: 'Care action is required' }, { status: 400 });
    }

    let result;

    switch (action) {
      case 'fertilize': {
        const validatedData = logFertilizerSchema.parse(data);
        
        // Check if the plant instance belongs to the user
        const plantInstance = await PlantInstanceQueries.getEnhancedById(validatedData.plantInstanceId);
        if (!plantInstance) {
          return NextResponse.json({ error: 'Plant instance not found' }, { status: 404 });
        }
        if (plantInstance.userId !== user.id) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        result = await PlantInstanceQueries.logFertilizer(
          validatedData.plantInstanceId,
          validatedData.fertilizerDate
        );
        break;
      }

      case 'repot': {
        const validatedData = logRepotSchema.parse(data);
        
        // Check if the plant instance belongs to the user
        const plantInstance = await PlantInstanceQueries.getEnhancedById(validatedData.plantInstanceId);
        if (!plantInstance) {
          return NextResponse.json({ error: 'Plant instance not found' }, { status: 404 });
        }
        if (plantInstance.userId !== user.id) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Combine notes with pot size and soil type if provided
        let combinedNotes = validatedData.notes || '';
        if (data.potSize) {
          combinedNotes += (combinedNotes ? '\n' : '') + `Pot size: ${data.potSize}`;
        }
        if (data.soilType) {
          combinedNotes += (combinedNotes ? '\n' : '') + `Soil type: ${data.soilType}`;
        }

        result = await PlantInstanceQueries.logRepot(
          validatedData.plantInstanceId,
          validatedData.repotDate,
          combinedNotes || undefined
        );
        break;
      }

      default:
        return NextResponse.json({ error: 'Invalid care action' }, { status: 400 });
    }

    // Get the enhanced plant instance with updated data
    const enhancedInstance = await PlantInstanceQueries.getEnhancedById(result.id);

    // Transform S3 keys to CloudFront URLs
    if (enhancedInstance) {
      transformS3KeysToCloudFrontUrls(enhancedInstance);
    }

    return NextResponse.json({
      success: true,
      message: `${action.charAt(0).toUpperCase() + action.slice(1)} logged successfully`,
      plantInstance: enhancedInstance,
    });
  } catch (error) {
    console.error('Failed to log care activity:', error);
    
    if (error instanceof Error && error.message.includes('validation')) {
      return NextResponse.json(
        { error: 'Invalid care data', details: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to log care activity' },
      { status: 500 }
    );
  }
}