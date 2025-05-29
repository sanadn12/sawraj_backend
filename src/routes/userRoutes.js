import { Router } from 'express';
import { createAccount,verifyotp,login,getUser,editUser} from '../controllers/userController.js';
import authenticateJWT from '../middlewares/jwtauth.js';

const router = Router();
 
router.post('/createaccount',createAccount);

router.post('/verifyotp',verifyotp);

router.post('/login',login);


router.put('/edit/:id',authenticateJWT,editUser);

// router.get('/all',authenticateJWT,getallusers);

router.get('/getuser/:id',authenticateJWT,getUser);

// router.delete('/delete/:id',authenticateJWT,deleteuser);

export default router;