import swaggerJSDoc from 'swagger-jsdoc';
import { API_PUBLIC_URL } from './constants';

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ClaimFlow API',
      version: '1.0.0',
      description: 'API documentation for the ClaimFlow management system',
    },
    servers: [
      {
        url: API_PUBLIC_URL,
        description: 'Configured API server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
};

export const swaggerSpec = swaggerJSDoc(options);
