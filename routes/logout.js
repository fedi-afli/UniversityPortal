
const express = require('express');
const router = express.Router();
router.all('/', (req, res) => {

    res.clearCookie('jwt', {
        httpOnly: true,
        secure: true, 
        sameSite: 'strict'
    });

   
    res.status(200).redirect('/');
});
module.exports = router;