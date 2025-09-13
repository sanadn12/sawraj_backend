import { Router } from 'express';
import { addlisting,getalllistings,getlisting,deletelisting,editlisting,getMyListing} from '../controllers/listingController.js';
import authenticateJWT from '../middlewares/jwtauth.js';

const router = Router();

router.post('/addlisting',authenticateJWT,addlisting);

router.get('/getalllistings',getalllistings);

router.get('/getlisting/:id',getlisting);

router.get('/getmylisting',authenticateJWT,getMyListing);


router.put('/edit/:id',authenticateJWT,editlisting);

router.delete('/delete/:id',authenticateJWT,deletelisting);
    





export default router;