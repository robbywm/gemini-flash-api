const express = require('express');
const dotenv = require('dotenv').config();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const {GoogleGenerativeAI}  = require('@google/generative-ai');


const app = express();
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
    model:  'models/gemini-2.0-flash'
})

const upload = multer({dest: 'uploads/'})

const port = 3000;

app.post('/generate-text', async (req, res) => {
    const {prompt} = req.body;
    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        res.json({output: response.text()});
    } catch (error) {
        res.status(500).json({error: error.message});
    }               
    }
)

const imageToGenerativePart = (filePath) => ({
        inlineData: {
            data: fs.readFileSync(filePath).toString('base64'),
            mimeType: 'image/png', // You might need to dynamically determine the MIME type
        },
    })

app.post('/generate-from-image', upload.single('image'), async (req, res) => {
    const prompt = req.body.prompt || 'Describe the image';
    const image = imageToGenerativePart(req.file.path);

    try {
        const result = await model.generateContent([prompt, image]);
        const response = result.response;
        res.json({output: response.text()});
    } catch (error) {
        res.status(500).json({error: error.message});
    } finally {
        fs.unlinkSync(req.file.path);
    }
});

app.post('/generate-from-document', upload.single('document'), async (req, res) => {

    const prompt = req.file.path;
    const buffer = fs.readFileSync(req.file.path);
    const base64Data = buffer.toString('base64');
    const mimeType = req.file.mimetype;
    
    try {
        const documentPart = {
            inlineData: {
                data: base64Data,
                mimeType: mimeType,
            },
        };

        const result = await model.generateContent(['Analyze this doucment:', documentPart]);
        const response = await result.response;
        res.json({output: response.text()});
    } catch (error) {
        res.status(500).json({error: error.message});
    } finally {
        fs.unlinkSync(req.file.path);   
    }
});

app.post('/generate-from-audio', upload.single('audio'), async (req, res) => {
    const audioBuffer = fs.readFileSync(req.file.path);
    const base64Audio = audioBuffer.toString('base64');
    const audioPart = {
        inlineData: {
            data: base64Audio,
            mimeType: req.file.mimetype
        }
    };

    try {
        const result = await model.generateContent([
        'Transcribe or analyze the following audio:', audioPart
        ]);
        const response = await result.response;
        res.json({output: response.text()});
    } catch (error) {
        res.status(500).json({error: error.message});
    } finally {
        fs.unlinkSync(req.file.path);
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
