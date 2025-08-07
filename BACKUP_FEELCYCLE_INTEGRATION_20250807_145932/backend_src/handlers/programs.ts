import { LambdaEvent, ApiResponse } from '../types';
import { ProgramsService } from '../services/programs-service';

/**
 * Programs API Handler
 * Handles program color information requests
 */
export const programsHandler = async (event: LambdaEvent): Promise<ApiResponse> => {
  console.log('Programs request:', JSON.stringify(event, null, 2));

  const method = event.httpMethod;
  const path = event.path;

  try {
    const programsService = new ProgramsService();

    // GET /programs - Get all programs
    if (method === 'GET' && path === '/programs') {
      const programs = await programsService.getAllPrograms();
      
      return {
        success: true,
        data: programs
      };
    }

    // GET /programs/{programCode} - Get specific program
    if (method === 'GET' && path?.startsWith('/programs/')) {
      const pathParts = path.split('/');
      const programCode = pathParts[2];
      
      if (!programCode) {
        return {
          success: false,
          error: 'Program code is required'
        };
      }

      const program = await programsService.getProgramByCode(programCode.toUpperCase());
      
      if (!program) {
        return {
          success: false,
          error: 'Program not found'
        };
      }

      return {
        success: true,
        data: program
      };
    }

    // GET /programs/genre/{genre} - Get programs by genre
    if (method === 'GET' && path?.startsWith('/programs/genre/')) {
      const pathParts = path.split('/');
      const genre = pathParts[3];
      
      if (!genre) {
        return {
          success: false,
          error: 'Genre is required'
        };
      }

      const programs = await programsService.getProgramsByGenre(genre.toUpperCase());
      
      return {
        success: true,
        data: programs
      };
    }

    return {
      success: false,
      error: 'Invalid request path or method'
    };

  } catch (error) {
    console.error('Programs handler error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};