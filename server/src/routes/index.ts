import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import claimRoutes from './claim.routes';
import userRoutes from './user.routes';
import workflowRoutes from './workflow.routes';
import { swaggerSpec } from '../config/swagger';

const router = Router();

router.use('/claims', claimRoutes);
router.use('/users', userRoutes);
router.use('/workflow', workflowRoutes);

router.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

export default router;