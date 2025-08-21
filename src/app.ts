import express from 'express';
import path from 'path';
import expressLayouts from 'express-ejs-layouts';

const app = express()
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, '../public')));
app.use(expressLayouts);

app.set('layout', 'layouts/default'); 

app.get('/', (req,res) => {
    res.render('pages/index', { title: 'Home' });   
})

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);    
})