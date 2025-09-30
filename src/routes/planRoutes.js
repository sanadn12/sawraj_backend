import { Router } from 'express';
import { createPlan, getPublicPlans,getUserPlans,getMyPlan,cashfreeWebhook, editPlan,verifyPayment, deletePlan,buyPlan} from '../controllers/planController.js';
import authenticateJWT from '../middlewares/jwtauth.js';




const router = Router();

router.post('/create', authenticateJWT, createPlan);

router.get('/public', getPublicPlans);

router.get('/all', authenticateJWT, getUserPlans);

router.put('/edit/:id', authenticateJWT, editPlan);

router.delete('/delete/:id', authenticateJWT, deletePlan);

router.post('/buy', authenticateJWT, buyPlan); 


router.get('/myplan',authenticateJWT,getMyPlan);
router.get('/verify/:orderId', verifyPayment);

router.post('/webhook',authenticateJWT,cashfreeWebhook);

 export default router;