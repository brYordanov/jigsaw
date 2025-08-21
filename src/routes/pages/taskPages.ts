import express from 'express';

const router = express.Router();

router.get("/tasks/create", (req, res) => {
    res.render('tasks/create-form');
})


export default router;