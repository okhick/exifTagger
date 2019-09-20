const piexif = require('piexifjs');
const fs = require('fs');
const { DateTime } = require('luxon');
const FormatCoords = require('formatcoords');

class Image {
  constructor(IO, zerothArgs, exifArgs, gpsArgs) {
    this.input = IO.input;
    this.output = IO.output;
    this.zerothArgs = zerothArgs;
    this.exifArgs = exifArgs;
    this.gpsArgs = gpsArgs
    this.exifObject = {
      "0th": {},
      "Exif": {},
      "GPS": {},
      "Interop": {},
      "1st": {}
    };
  }

  readImage() {
    let raw = fs.readFileSync(this.input);
    this.imageBin = raw.toString('binary');
  }

  readExif() {
    //read the raw exif data
    let allExistingExif = piexif.load(this.imageBin);

    //loop through all data types and extract all data into a human readable/workable format
    for (let ifd in allExistingExif) {
      if (ifd == "thumbnail") {
        continue;
      }

      for (let tag in allExistingExif[ifd]) {
        let key = piexif.TAGS[ifd][tag]["name"];
        this.exifObject[ifd][key] = allExistingExif[ifd][tag];
      }
    }
  }

  prepareNewZeroth() {
    let zerothData = this.exifObject["0th"];
    zerothData.Make = this.zerothArgs.Make;
    zerothData.Model = this.zerothArgs.Model;
    zerothData.ImageDescription = this.zerothArgs.ImageDescription;
    zerothData.Artist = this.zerothArgs.Artist;
    zerothData.Copyright = this.zerothArgs.Copyright;
  }

  prepareNewExif() {
    let exifData = this.exifObject.Exif;
    exifData.LensMake = this.exifArgs.LensMake;
    exifData.LensModel = this.exifArgs.LensModel;
    exifData.DateTimeOriginal = this.__formatTimeOriginal();
    exifData.DateTimeDigitized = this.__getDateCreated();
    exifData.ExposureTime = this.__calculateExposureTime();
    exifData.FNumber = this.__calculateFNumber();
    exifData.ISOSpeedRatings = parseInt(this.exifArgs.ISOSpeedRatings);
    exifData.FocalLength = this.__calculateFocalLength(this.exifArgs.FocalLength);
    exifData.FocalLengthIn35mmFilm = this.__calculateFocalLength(this.exifArgs.FocalLengthIn35mmFilm);
    exifData.ExposureBiasValue = this.__calculateCompensation();
    // console.log(this.exifObject);
  }

  prepareNewGPS() {
    let parsedGPS = this.__parseGPS();
    this.exifObject.GPS = {...parsedGPS};
  }

  swapExifIds() {
    for (let ifd in this.exifObject) {
      let thisIfd = this.exifObject[ifd];

      switch(ifd) {
        case '0th':
          Object.keys(thisIfd).map( (id) => {
            thisIfd[piexif.ImageIFD[id]] = thisIfd[id];
            delete thisIfd[id];
          });
          break;

        case 'Exif':
          Object.keys(thisIfd).map( (id) => {
            thisIfd[piexif.ExifIFD[id]] = thisIfd[id];
            delete thisIfd[id];
          });
          break;

        case 'GPS':
          Object.keys(thisIfd).map( (id) => {
            thisIfd[piexif.GPSIFD[id]] = thisIfd[id];
            delete thisIfd[id];
          });
          break;

        case 'Interop':
          Object.keys(thisIfd).map( (id) => {
            thisIfd[piexif.InteropIFD[id]] = thisIfd[id];
            delete thisIfd[id];
          });
          break;

        case '1st':
          Object.keys(thisIfd).map( (id) => {
            thisIfd[piexif.ImageIFD[id]] = thisIfd[id];
            delete thisIfd[id];
          });
          break;
      }
    }
  }

  generateImageWithExif() {
    let exifBytes = piexif.dump(this.exifObject);
    let newImageBin = piexif.insert(exifBytes, this.imageBin);
    this.newImage = new Buffer.from(newImageBin, "binary");
  }

  saveImageWithExif() {
    fs.writeFileSync(this.output, this.newImage);
  }

  printExif() {
    console.log(this.exifObject['GPS']);
    // for (var ifd in this.exifObject) {
    //   if (ifd == "thumbnail") {
    //     continue;
    //   }
    //   console.log("-" + ifd);
    //   for (var tag in this.exifObject[ifd]) {
    //     console.log("  " + piexif.TAGS[ifd][tag]["name"] + ":" + this.exifObject[ifd][tag]);
    //   }
    // }
  }

  //================================================================//
  //=========================HELPER FUNCTIONS=======================//
  // ===============================================================//

  __calculateFocalLength(length) {
    return [ parseInt(length) , 1 ]
  }

  __calculateExposureTime() {
    let exposureTime = this.exifArgs.ExposureTime;

    //split apart at the '/' and make them ints
    exposureTime = exposureTime.split("/").map( (str) => {
      return parseInt(str);
    });

    return exposureTime;
  }

  __calculateFNumber() {
    let fNumber = this.exifArgs.FNumber;

    //strip out the 'f' convert to number
    if(fNumber.charAt(0) === 'f') {
      fNumber = parseFloat(fNumber.slice(1));
    } else {
      fNumber = parseFloat(fNumber);
    }

    return this.__formatInRational(fNumber, 2);
  }

  __calculateCompensation() {
    let compensation = this.exifArgs.ExposureBiasValue;

    if(Number.isSafeInteger(compensation)) { //if it's already an int
      return [compensation, 0];
    } else {
      compensation = compensation.split("/").map ( (str) => {
        let strNoWhite = str.replace(/\s+/g, '');
        return parseInt(strNoWhite);
      });
      return compensation;
    }
  }

  __getDateCreated() {
    let allStats = fs.statSync(this.input);
    let birthTime = allStats.birthtime;
    let parsedTime = birthTime.toISOString();
    let formattedTime = DateTime.fromISO(parsedTime).toFormat('yyyy:MM:dd HH:mm:ss');
    return formattedTime;
  }

  __formatTimeOriginal() {
    let rawTime = this.exifArgs.DateTimeOriginal;
    let timeString = `${rawTime.date} ${rawTime.time}`;
    let parsedTime = DateTime.fromFormat(timeString, 'yyyy-MM-dd h:mm a');
    let formattedTime = parsedTime.toFormat('yyyy:MM:dd HH:mm:ss');
    return formattedTime;
  }

  __parseGPS() {
    let latitude = parseFloat(this.gpsArgs.Latitude);
    let longitude = parseFloat(this.gpsArgs.Longitude);

    let coords = FormatCoords(latitude, longitude);
    let latitudeFormatted = [
      this.__formatInRational(coords.latValues.degreesInt, 1),
      this.__formatInRational(coords.latValues.minutesInt, 1),
      this.__formatInRational(coords.latValues.seconds, 4)
    ];
    let longitudeFormatted = [
      this.__formatInRational(coords.lonValues.degreesInt, 1),
      this.__formatInRational(coords.lonValues.minutesInt, 1),
      this.__formatInRational(coords.lonValues.seconds, 4)
    ]

    return {
      GPSLatitudeRef: (coords.north) ? 'N' : 'S',
      GPSLatitude: latitudeFormatted,
      GPSLongitudeRef: (coords.east) ? 'E' : 'W',
      GPSLongitude: longitudeFormatted
    }
  }

  __formatInRational(num, exp) {
    let mul = Math.pow(10, exp);
    
    let fixedNum = num.toFixed(4);
    //multiply by 10000 to get rid of the float, find the greatest common denom.
    let gcd = [fixedNum * mul , mul].gcd();
    //divide each number by gcd to get the correct array structure
    return [(fixedNum * mul)/gcd , mul/gcd];
  }
}

module.exports = {
  Image: Image
}

Array.prototype.gcd = function () {
   if (this.length === 0)
     return null;
   return this.reduce((prev, curr) => {
   if (curr <= 0.0001)
     return Math.ceil(prev);
   else
     return [curr, prev % curr].gcd();
   });
 }

 function gcd(k, n) {
  return k ? gcd(n % k, k) : n;
}
