const fs = require("fs");
const parse = require("csv-parse/lib/sync");
const program = require('commander');

const image = require('./exif-image.js');
const Image = image.Image;

program
  .option('--csv <file>', 'The data CSV')
  .option('--input <directory>', 'Path to untagged images')
  .option('--output <directory>', 'Place to put the tagged images')
  .option('--profile <directory>', 'Place where the profile files are')
  .option('--readOnly', 'Only reads exif data');

program.parse(process.argv);

if (program.readOnly) {
  readExif();
  return;
}

//load up the photo info
const csv = ( () => {
  let rawCSV = fs.readFileSync(`./data/${program.csv}`);
  let parsedCSV = parse(rawCSV, { columns: true });
  return parsedCSV;
}) ();

//load up the camera profile
const cameraInfo = ( () => {
  let rawCamera = fs.readFileSync(`${program.profile}/cameraProfile.json`);
  let parsedCamera = JSON.parse(rawCamera);
  return parsedCamera;
}) ();

//load up the user
const user = ( () => {
  let rawUser = fs.readFileSync(`${program.profile}/userProfile.json`);
  let parsedUser = JSON.parse(rawUser);
  return parsedUser;
}) ();

let counter = 0;
csv.forEach( (line) => {
  try {

    const zerothArgs = {
      "Make": cameraInfo.camera.Make,
      "Model": cameraInfo.camera.Model,
      "ImageDescription": line.ImageDescription,
      "Artist": user.Artist,
      "Copyright": user.Copyright
    }

    const exifArgs = {
      "LensMake": cameraInfo.lens.LensMake,
      "LensModel": cameraInfo.lens.LensModel,
      "DateTimeOriginal": {"date":line.Date, "time":line.Time},
      "ExposureTime": line.ExposureTime,
      "FNumber": line.FNumber,
      "Flash": (line.Flash) ? line.Flash : 0,
      "ISOSpeedRatings": line.ISOSpeedRatings,
      "FocalLength": line.FocalLength,
      "FocalLengthIn35mmFilm": line.FocalLengthIn35mmFilm,
      "ExposureBiasValue": line.ExposureBiasValue
    }

    const gpsArgs = {
      "Latitude": line.Latitude,
      "Longitude": line.Longitude
    }

    const IO = {
      "input": `${program.input}/${line.input_name}`,
      "output": `${program.output}/${line.output_name}`
    }

    const testImage = new Image(IO, zerothArgs, exifArgs, gpsArgs);
      testImage.readImage();
      testImage.readExif();
      testImage.prepareNewZeroth();
      testImage.prepareNewExif();
      try {
        testImage.prepareNewGPS();
      } catch (e) {
        console.log("No GPS data? Looks like it...");
      }
      testImage.swapExifIds();
      testImage.generateImageWithExif();
      testImage.saveImageWithExif();

    console.log(`${IO.output} has been tagged!`);
    counter++;

    if (counter === csv.length) {
      console.log('All images have been tagged.');
    }

  } catch (e) {
    console.log(e);
  }
});


function readExif() {
  const image = {input: './20190901_5.JPG'}
  const testImage = new Image(image, {}, {});
  testImage.readImage();
  testImage.readExif();
  testImage.printExif();
}
