import { Router } from 'express';
import { createAccount,verifyotp,login,getUser,editUser, editProfilePic,getAllUsers} from '../controllers/userController.js';
import authenticateJWT from '../middlewares/jwtauth.js';




const router = Router();
 
router.post('/createaccount',createAccount);

router.post('/verifyotp',verifyotp);

router.post('/login',login);


router.put('/edit',authenticateJWT,editUser);

// router.get('/all',authenticateJWT,getallusers);

router.get('/getuser',authenticateJWT,getUser);

router.get('/all', authenticateJWT, getAllUsers);

router.put('/image', authenticateJWT, editProfilePic);

// router.delete('/delete/:id',authenticateJWT,deleteuser);

export default router;