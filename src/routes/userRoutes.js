import { Router } from 'express';
import { createAccount,verifyotp,login,getUser,feed,searchUser, userSuggestions,getFollowers,deletePost,createPost,getFollowings,editPublicProfile,  createPublicProfile, editUser,getOwnProfile,unfollowUser, followUser,  getOtherPublicProfile, editProfilePic,getAllUsers} from '../controllers/userController.js';
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


router.post('/createpublicprofile',authenticateJWT,createPublicProfile);

router.get('/getotherprofile/:username',getOtherPublicProfile);

router.get('/getmyprofile',authenticateJWT,getOwnProfile);

router.post('/follow',authenticateJWT,followUser);

router.post('/unfollow',authenticateJWT,unfollowUser);      

router.get('/followers/:username',getFollowers);

router.get('/followings/:username',getFollowings);

router.put('/editpublicprofile',authenticateJWT,editPublicProfile);

router.post('/createpost',authenticateJWT,createPost);

router.delete('/deletepost/:postId',authenticateJWT,deletePost);


router.get('/feed',feed);

router.get('/suggestions',userSuggestions);

router.get('/search',searchUser);

export default router;