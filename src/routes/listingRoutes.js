import { Router } from 'express';
import { addlisting,getalllistings,getlisting,deletelisting,editlisting,getMyListing, bid,getAuction,comment} from '../controllers/listingController.js';
import authenticateJWT from '../middlewares/jwtauth.js';

const router = Router();

router.post('/addlisting',authenticateJWT,addlisting);

router.get('/getalllistings',getalllistings);

router.get('/getlisting/:id',getlisting);

router.get('/getmylisting',authenticateJWT,getMyListing);


router.put('/edit/:id',authenticateJWT,editlisting);

router.delete('/delete/:id',authenticateJWT,deletelisting);


router.get('/auction/:id',authenticateJWT,getAuction);

router.post('/bid',authenticateJWT,bid);

    
router.post('/comment',authenticateJWT,comment)




export default router;