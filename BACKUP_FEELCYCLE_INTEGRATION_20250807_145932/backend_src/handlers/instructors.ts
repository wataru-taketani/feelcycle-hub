import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { InstructorsService } from '../services/instructors-service';

interface ApiResponse {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization,x-user-id',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
};

function createResponse(statusCode: number, body: ApiResponse): APIGatewayProxyResult {
  return {
    statusCode,
    headers,
    body: JSON.stringify(body),
  };
}

/**
 * Instructors API Handler
 * GET /instructors - Get all instructors or filter by category
 * GET /instructors/{id} - Get specific instructor
 */
export async function instructorsHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  console.log('📚 Instructors API handler called');
  console.log('Event:', JSON.stringify(event, null, 2));

  const instructorsService = new InstructorsService();
  const httpMethod = event.httpMethod || 'GET';
  const pathParameters = event.pathParameters || {};
  const queryStringParameters = event.queryStringParameters || {};

  try {
    // Handle different HTTP methods and paths
    if (httpMethod === 'GET') {
      // GET /instructors/{id} - Get specific instructor
      if (pathParameters.id) {
        const instructorId = pathParameters.id;
        const instructor = await instructorsService.getInstructor(instructorId);
        
        if (!instructor) {
          return {
            statusCode: 404,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Headers': 'Content-Type,Authorization,x-user-id',
              'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
            },
            body: JSON.stringify({
              success: false,
              error: 'Instructor not found',
              message: `Instructor with ID ${instructorId} not found`,
            }),
          };
        }

        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization,x-user-id',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
          },
          body: JSON.stringify({
            success: true,
            data: instructor,
            message: 'Instructor retrieved successfully',
          }),
        };
      }

      // GET /instructors - Get all instructors or filter by category
      const category = queryStringParameters.category;
      
      if (category) {
        // Filter by category
        const instructors = await instructorsService.getInstructorsByCategory(category.toUpperCase());
        return createResponse(200, {
          success: true,
          data: {
            instructorGroups: { [category.toUpperCase()]: instructors.sort((a, b) => a.name.localeCompare(b.name)) },
            categories: [category.toUpperCase()],
            total: instructors.length,
          },
          message: `Instructors in category ${category.toUpperCase()} retrieved successfully`,
        });
      } else {
        // Get all instructors
        const allInstructors = await instructorsService.getAllInstructors();
        
        // Group by category for better organization
        const instructorsByCategory = allInstructors.reduce((acc: any, instructor: any) => {
          const category = instructor.category || 'OTHER';
          if (!acc[category]) {
            acc[category] = [];
          }
          acc[category].push(instructor);
          return acc;
        }, {});

        // Sort instructors within each category
        Object.keys(instructorsByCategory).forEach(category => {
          instructorsByCategory[category].sort((a: any, b: any) => a.name.localeCompare(b.name));
        });

        return createResponse(200, {
          success: true,
          data: {
            instructorGroups: instructorsByCategory,
            categories: Object.keys(instructorsByCategory).sort(),
            total: allInstructors.length,
          },
          message: 'All instructors retrieved successfully',
        });
      }
    }

    return createResponse(405, {
      success: false,
      error: 'Method not allowed',
      message: `HTTP method ${httpMethod} is not supported`,
    });

  } catch (error) {
    console.error('❌ Instructors API error:', error);
    return createResponse(500, {
      success: false,
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    });
  }
}

// Legacy export for backward compatibility
export const handler = instructorsHandler;