import { PlantInstanceQueries } from '@/lib/db/queries/plant-instances';
import { PlantQueries } from '@/lib/db/queries/plants';
import type { 
  CreatePlantInstance, 
  UpdatePlantInstance,
  PlantInstanceFilter,
  PlantInstanceSearch,
  LogFertilizer,
  LogRepot,
  BulkPlantInstanceOperation
} from '@/lib/validation/plant-schemas';
import type { 
  EnhancedPlantInstance,
  PlantInstanceSearchResult,
  CareDashboardData,
  PlantInstanceOperationResult,
  BulkOperationResult,
  PlantInstanceFormData
} from '@/lib/types/plant-instance-types';
import { plantInstanceHelpers } from '@/lib/types/plant-instance-types';

export class PlantInstanceService {
  // Create a new plant instance with validation
  static async create(data: CreatePlantInstance): Promise<PlantInstanceOperationResult> {
    try {
      // Verify that the plant exists
      const plant = await PlantQueries.getById(data.plantId);
      if (!plant) {
        return {
          success: false,
          error: 'Plant taxonomy not found',
        };
      }

      // Calculate initial fertilizer due date if not provided
      if (data.fertilizerSchedule && !data.fertilizerDue) {
        const now = new Date();
        const scheduleMatch = data.fertilizerSchedule.match(/(\d+)\s*(day|week|month)s?/i);
        
        if (scheduleMatch) {
          const [, amount, unit] = scheduleMatch;
          const dueDate = new Date(now);
          
          switch (unit.toLowerCase()) {
            case 'day':
              dueDate.setDate(dueDate.getDate() + parseInt(amount));
              break;
            case 'week':
              dueDate.setDate(dueDate.getDate() + (parseInt(amount) * 7));
              break;
            case 'month':
              dueDate.setMonth(dueDate.getMonth() + parseInt(amount));
              break;
          }
          
          data.fertilizerDue = dueDate;
        }
      }

      // Create the plant instance
      const plantInstance = await PlantInstanceQueries.create(data);
      
      // Get enhanced instance
      const enhancedInstance = await PlantInstanceQueries.getEnhancedById(plantInstance.id);
      
      return {
        success: true,
        instance: enhancedInstance!,
      };
    } catch (error) {
      console.error('Failed to create plant instance:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create plant instance',
      };
    }
  }

  // Update a plant instance
  static async update(id: number, data: Partial<UpdatePlantInstance>, userId: number): Promise<PlantInstanceOperationResult> {
    try {
      // Verify ownership
      const existingInstance = await PlantInstanceQueries.getEnhancedById(id);
      if (!existingInstance) {
        return {
          success: false,
          error: 'Plant instance not found',
        };
      }

      if (existingInstance.userId !== userId) {
        return {
          success: false,
          error: 'Unauthorized access to plant instance',
        };
      }

      // If plant ID is being changed, verify the new plant exists
      if (data.plantId && data.plantId !== existingInstance.plantId) {
        const plant = await PlantQueries.getById(data.plantId);
        if (!plant) {
          return {
            success: false,
            error: 'New plant taxonomy not found',
          };
        }
      }

      // Update fertilizer due date if schedule changed
      if (data.fertilizerSchedule && data.fertilizerSchedule !== existingInstance.fertilizerSchedule) {
        const now = new Date();
        const scheduleMatch = data.fertilizerSchedule.match(/(\d+)\s*(day|week|month)s?/i);
        
        if (scheduleMatch) {
          const [, amount, unit] = scheduleMatch;
          const dueDate = new Date(now);
          
          switch (unit.toLowerCase()) {
            case 'day':
              dueDate.setDate(dueDate.getDate() + parseInt(amount));
              break;
            case 'week':
              dueDate.setDate(dueDate.getDate() + (parseInt(amount) * 7));
              break;
            case 'month':
              dueDate.setMonth(dueDate.getMonth() + parseInt(amount));
              break;
          }
          
          data.fertilizerDue = dueDate;
        }
      }

      // Update the plant instance
      const updatedInstance = await PlantInstanceQueries.update(id, data);
      
      // Get enhanced instance
      const enhancedInstance = await PlantInstanceQueries.getEnhancedById(updatedInstance.id);
      
      return {
        success: true,
        instance: enhancedInstance!,
      };
    } catch (error) {
      console.error('Failed to update plant instance:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update plant instance',
      };
    }
  }

  // Get plant instances with filtering and search
  static async getWithFilters(filters: PlantInstanceFilter): Promise<PlantInstanceSearchResult> {
    try {
      return await PlantInstanceQueries.getWithFilters(filters);
    } catch (error) {
      console.error('Failed to get plant instances with filters:', error);
      throw new Error('Failed to get plant instances');
    }
  }

  // Search plant instances
  static async search(searchParams: PlantInstanceSearch): Promise<PlantInstanceSearchResult> {
    try {
      return await PlantInstanceQueries.searchWithFilters(searchParams);
    } catch (error) {
      console.error('Failed to search plant instances:', error);
      throw new Error('Failed to search plant instances');
    }
  }

  // Get care dashboard data
  static async getCareDashboard(userId: number): Promise<CareDashboardData> {
    try {
      return await PlantInstanceQueries.getCareDashboardData(userId);
    } catch (error) {
      console.error('Failed to get care dashboard data:', error);
      throw new Error('Failed to get care dashboard data');
    }
  }

  // Log fertilizer application
  static async logFertilizer(data: LogFertilizer, userId: number): Promise<PlantInstanceOperationResult> {
    try {
      // Verify ownership
      const plantInstance = await PlantInstanceQueries.getEnhancedById(data.plantInstanceId);
      if (!plantInstance) {
        return {
          success: false,
          error: 'Plant instance not found',
        };
      }

      if (plantInstance.userId !== userId) {
        return {
          success: false,
          error: 'Unauthorized access to plant instance',
        };
      }

      // Log fertilizer
      const updatedInstance = await PlantInstanceQueries.logFertilizer(
        data.plantInstanceId,
        data.fertilizerDate
      );

      // Get enhanced instance
      const enhancedInstance = await PlantInstanceQueries.getEnhancedById(updatedInstance.id);
      
      return {
        success: true,
        instance: enhancedInstance!,
      };
    } catch (error) {
      console.error('Failed to log fertilizer:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to log fertilizer',
      };
    }
  }

  // Log repotting
  static async logRepot(data: LogRepot, userId: number): Promise<PlantInstanceOperationResult> {
    try {
      // Verify ownership
      const plantInstance = await PlantInstanceQueries.getEnhancedById(data.plantInstanceId);
      if (!plantInstance) {
        return {
          success: false,
          error: 'Plant instance not found',
        };
      }

      if (plantInstance.userId !== userId) {
        return {
          success: false,
          error: 'Unauthorized access to plant instance',
        };
      }

      // Log repot
      const updatedInstance = await PlantInstanceQueries.logRepot(
        data.plantInstanceId,
        data.repotDate,
        data.notes
      );

      // Get enhanced instance
      const enhancedInstance = await PlantInstanceQueries.getEnhancedById(updatedInstance.id);
      
      return {
        success: true,
        instance: enhancedInstance!,
      };
    } catch (error) {
      console.error('Failed to log repot:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to log repot',
      };
    }
  }

  // Perform bulk operations
  static async bulkOperation(operation: BulkPlantInstanceOperation, userId: number): Promise<BulkOperationResult> {
    try {
      // Verify ownership of all plant instances
      const plantInstances = await Promise.all(
        operation.plantInstanceIds.map(id => PlantInstanceQueries.getEnhancedById(id))
      );

      const unauthorizedIds: number[] = [];
      const notFoundIds: number[] = [];

      plantInstances.forEach((instance, index) => {
        const id = operation.plantInstanceIds[index];
        if (!instance) {
          notFoundIds.push(id);
        } else if (instance.userId !== userId) {
          unauthorizedIds.push(id);
        }
      });

      if (notFoundIds.length > 0 || unauthorizedIds.length > 0) {
        return {
          success: false,
          successCount: 0,
          failureCount: operation.plantInstanceIds.length,
          results: operation.plantInstanceIds.map(id => ({
            plantInstanceId: id,
            success: false,
            error: notFoundIds.includes(id) ? 'Plant instance not found' : 'Unauthorized access',
          })),
        };
      }

      // Perform bulk operation
      return await PlantInstanceQueries.bulkOperation(operation);
    } catch (error) {
      console.error('Failed to perform bulk operation:', error);
      return {
        success: false,
        successCount: 0,
        failureCount: operation.plantInstanceIds.length,
        results: operation.plantInstanceIds.map(id => ({
          plantInstanceId: id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        })),
      };
    }
  }

  // Get plant instance by ID with ownership check
  static async getById(id: number, userId: number): Promise<EnhancedPlantInstance | null> {
    try {
      const plantInstance = await PlantInstanceQueries.getEnhancedById(id);
      
      if (!plantInstance || plantInstance.userId !== userId) {
        return null;
      }

      return plantInstance;
    } catch (error) {
      console.error('Failed to get plant instance by ID:', error);
      return null;
    }
  }

  // Delete plant instance with ownership check
  static async delete(id: number, userId: number): Promise<PlantInstanceOperationResult> {
    try {
      // Verify ownership
      const plantInstance = await PlantInstanceQueries.getEnhancedById(id);
      if (!plantInstance) {
        return {
          success: false,
          error: 'Plant instance not found',
        };
      }

      if (plantInstance.userId !== userId) {
        return {
          success: false,
          error: 'Unauthorized access to plant instance',
        };
      }

      // Delete the plant instance
      const deleted = await PlantInstanceQueries.delete(id);
      
      if (!deleted) {
        return {
          success: false,
          error: 'Failed to delete plant instance',
        };
      }

      return {
        success: true,
      };
    } catch (error) {
      console.error('Failed to delete plant instance:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete plant instance',
      };
    }
  }

  // Activate/deactivate plant instance
  static async setActiveStatus(id: number, isActive: boolean, userId: number): Promise<PlantInstanceOperationResult> {
    try {
      // Verify ownership
      const plantInstance = await PlantInstanceQueries.getEnhancedById(id);
      if (!plantInstance) {
        return {
          success: false,
          error: 'Plant instance not found',
        };
      }

      if (plantInstance.userId !== userId) {
        return {
          success: false,
          error: 'Unauthorized access to plant instance',
        };
      }

      // Update active status
      const updatedInstance = isActive 
        ? await PlantInstanceQueries.reactivate(id)
        : await PlantInstanceQueries.deactivate(id);

      // Get enhanced instance
      const enhancedInstance = await PlantInstanceQueries.getEnhancedById(updatedInstance.id);
      
      return {
        success: true,
        instance: enhancedInstance!,
      };
    } catch (error) {
      console.error('Failed to update plant instance status:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update plant instance status',
      };
    }
  }

  // Get user locations
  static async getUserLocations(userId: number): Promise<string[]> {
    try {
      return await PlantInstanceQueries.getUserLocations(userId);
    } catch (error) {
      console.error('Failed to get user locations:', error);
      return [];
    }
  }

  // Process form data for plant instance creation/update
  static processFormData(formData: PlantInstanceFormData): Partial<CreatePlantInstance> {
    const processedData: Partial<CreatePlantInstance> = {
      plantId: formData.plantId,
      nickname: formData.nickname,
      location: formData.location,
      fertilizerSchedule: formData.fertilizerSchedule,
      lastFertilized: formData.lastFertilized,
      fertilizerDue: formData.fertilizerDue,
      lastRepot: formData.lastRepot,
      notes: formData.notes,
      isActive: formData.isActive,
    };

    // Handle images - combine existing and new images
    const images: string[] = [];
    
    // Add existing images
    if (formData.existingImages) {
      images.push(...formData.existingImages);
    }

    // Convert new image files to base64 (this would typically be done on the client side)
    // For now, we'll just handle the existing images
    processedData.images = images;

    return processedData;
  }

  // Validate fertilizer schedule format
  static validateFertilizerSchedule(schedule: string): boolean {
    return /^\d+\s*(day|week|month)s?$/i.test(schedule);
  }

  // Calculate next fertilizer due date
  static calculateNextFertilizerDue(schedule: string, lastFertilized?: Date): Date | null {
    if (!this.validateFertilizerSchedule(schedule)) {
      return null;
    }

    const baseDate = lastFertilized || new Date();
    const scheduleMatch = schedule.match(/(\d+)\s*(day|week|month)s?/i);
    
    if (!scheduleMatch) return null;

    const [, amount, unit] = scheduleMatch;
    const dueDate = new Date(baseDate);
    
    switch (unit.toLowerCase()) {
      case 'day':
        dueDate.setDate(dueDate.getDate() + parseInt(amount));
        break;
      case 'week':
        dueDate.setDate(dueDate.getDate() + (parseInt(amount) * 7));
        break;
      case 'month':
        dueDate.setMonth(dueDate.getMonth() + parseInt(amount));
        break;
    }
    
    return dueDate;
  }
}