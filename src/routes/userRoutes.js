import { Router } from 'express';
import { createAccount,verifyotp,login,getUser,editUser, editProfilePic} from '../controllers/userController.js';
import authenticateJWT from '../middlewares/jwtauth.js';
import multer from 'multer';

export const storage = multer.memoryStorage();
export const upload = multer({ storage: storage });


const router = Router();
 
router.post('/createaccount',createAccount);

router.post('/verifyotp',verifyotp);

router.post('/login',login);


router.put('/edit/:id',authenticateJWT,editUser);

// router.get('/all',authenticateJWT,getallusers);

router.get('/getuser/:id',authenticateJWT,getUser);



router.put('/image/:id', authenticateJWT, upload.single('profilePicture'), editProfilePic);

// router.delete('/delete/:id',authenticateJWT,deleteuser);

export default router;