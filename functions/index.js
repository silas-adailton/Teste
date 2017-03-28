'use strict';

const functions = require('firebase-functions');
const gcs = require('@google-cloud/storage')();
const spawn = require('child-process-promise').spawn;

//Escuta um evento em um end point especifico do storage
//functions.storage.bucket('').object().onChange(event =>{});

//Escuta um evento dentro do storagec
exports.generateThumbnail = functions.storage.object().onChange(event => {
    const object = event.data;

const fileBucket = object.bucket;
const filePath = object.name;
const contentType = object.contentType;
const resourceState = object.resourceState;

//Se não for uma imagem
if (!contentType.startsWith('image/')) {
    console.log('Isso não é uma imagem');
    return;
}

//Obtem o nome do arquivo
const fileName = filePath.split('/').pop(); 
//Verifica se a imagem ja é uma thumbnail                        
if (fileName.startsWith('thumb_')) {
    console.log('Ja é um thumbnail');
    return;
}

//Verifica se é um evento de movimentação ou exclusão
if (resourceState === 'not_exists'){
    console.log('É um evento de exclusão.');
    return;
}

//Gerar o thumbnail
//Download do arquivo 

const bucket = gcs.bucket(fileBucket);
const tempFilePath = `/tmp/${fileName}`;
return bucket.file(filePath).download({
    destination: tempFilePath
}).then(()=> {
    console.log('Download da imagem para ', tempFilePath);

    //Gerar o thumbnail usando ImageMagick
    return spawn('convert', [tempFilePath, '-thumbnail', '200x200>', tempFilePath]).then(() => {
        console.log('Thumbnail criado em ', tempFilePath);

        //Adiciona um prefixo'thumb_' para thumbnail fileName e faz o upload do thumbnail
        const thumbFilePath = filePath.replace(/(\/)?([^\/]*)$/, `$1thumb_$2`);

        //upload do thumbnail
        return bucket.upload(tempFilePath, {
            destination: thumbFilePath
        });
    });
});
});