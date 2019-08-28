const piexif = require("piexifjs");
const fs = require("fs");

const jpeg = fs.readFileSync('20190808_01.jpg');
// const jpeg = fs.readFileSync('bike.jpg');
const data = jpeg.toString("binary");

const zeroth = {};
zeroth[piexif.ImageIFD.Make] = "Canon";
zeroth[piexif.ImageIFD.Model] = "FT QL";
zeroth[piexif.ImageIFD.ImageDescription] = "Shot on Fuji ISO 400";
zeroth[piexif.ImageIFD.Artist] = "Oliver Hickman";
zeroth[piexif.ImageIFD.Copyright] = "Oliver Hickman 2019";

const exif = {};
exif[piexif.ExifIFD.LensMake] = "Canon";
exif[piexif.ExifIFD.LensModel] = "FD 50mm 1:1.8"

exif[piexif.ExifIFD.DateTimeOriginal] = "2019:08:08 07:00:00";
exif[piexif.ExifIFD.DateTimeDigitized] = "2019:08:08 07:00:00"; //when it was scanned. Get from photo
exif[piexif.ExifIFD.ExposureTime] = [1, 4];
exif[piexif.ExifIFD.FNumber] = [4, 1];
exif[piexif.ExifIFD.Flash] = 0;
exif[piexif.ExifIFD.ISOSpeedRatings] = 400;
exif[piexif.ExifIFD.FocalLength] = [35, 1];
exif[piexif.ExifIFD.FocalLengthIn35mmFilm] = [35, 1];

const exifObj = {
  "0th": zeroth,
  "Exif": exif
};
const exifbytes = piexif.dump(exifObj);

const newData = piexif.insert(exifbytes, data);
var newJpeg = new Buffer(newData, "binary");
fs.writeFileSync('Kiersten.jpg', newJpeg);

// const exifInfo = piexif.load(data);
// for (var ifd in exifInfo) {
//   if (ifd == "thumbnail") {
//     continue;
//   }
//   console.log("-" + ifd);
//   for (var tag in exifInfo[ifd]) {
//     console.log("  " + piexif.TAGS[ifd][tag]["name"] + ":" + exifInfo[ifd][tag]);
//   }
// }
