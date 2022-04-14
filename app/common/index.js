function showInputOutputInfo(info) {
  console.log(`  name: ${info.name()}`);
  console.log(`  precision: ${info.getPrecision()}`);
  console.log(`  layout: ${info.getLayout()}`);
  console.log(`  dims: [${info.getDims()}]`);
}

function warning(msg) {
  console.log('\x1b[33m' + msg + '\x1b[0m');
}

function showAvailableDevices(core) {
  const devices = core.getAvailableDevices();
  console.log(`Available target devices: ${devices.join(' ')}`);
}

const xmlExtensionPattern = /\.xml$/g

function binPathFromXML(xmlPath) {
  return xmlPath.replace(xmlExtensionPattern, '.bin');
}

function labelsPathFromXML(xmlPath) {
  return xmlPath.replace(xmlExtensionPattern, '.labels');
}

function findTimeDifferenceInMinutes(start, end) {
  var timeDiffInMs = end - start;
  var diffMinutes = (((timeDiffInMs % 86400000) % 3600000) / 60000).toFixed(4);
  return diffMinutes;
}

function findTimeDifferenceInMs(start, end) {
  var timeDiffInMs = end - start;
  // var diffSeconds = Math.floor(timeDiffInMs / 1000);
  return timeDiffInMs;
}

function logArray(peopleList) {
  peopleList.forEach((person) => {
    // console.log('&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&');
    // console.log('PERSON RAW');
    // console.log(person);
    // console.log('&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&');

    // we add filtering to this before the output
    // e.g. - if the person was only seen once and the number of facial matches is less than 10 or something
    // filter based on data (face matches per minute needs to be over 2 and face match confidence needs to be less than .63)
    
    var minutesPersonInView = 0;
    // dividing to figure out the matches per minute.  If they have an undefined value in the lastObservedTime we need to catch that
    try {
      minutesPersonInView = (((person.lastObservedTime.getTime() - person.firstObservedTime.getTime()) / 1000) / 60).toFixed(4);
    } catch (err) {
      minutesPersonInView = 0;
    }

    // figure out face matches per minute -- anything over 1.5 and we consider them someone to keep track of
    var personFpm = (person.faceMatches.length / minutesPersonInView).toFixed(4);

    // if (personFpm > 1.5) {
    console.log('**********************************');
    console.log(`Person::: id: ${person.id}`);
    console.log(`Gender: ${person.gender.result}  ${person.gender.confidence}`);
    console.log('Genders:');
    
    var males = person.genders.filter(x => x.result === 'Male');
    var females = person.genders.filter(x => x.result === 'Female');
    console.log(`Males: ${males.length} Female: ${females.length}`);
    
    console.log(`Age (via average): ${((person.ages.reduce((a, b) => a + b) / person.ages.length) * 100).toFixed(2)}`);

    console.log(`Age Range: ${person.foundAgeRange.result} - ${person.foundAgeRange.confidence}`);

    console.log(`First Facial Match: ${person.firstMatchConfidence}`);
    console.log(`Facial Matches: ${person.faceMatches.length}`);
    console.log(`First Time: ${person.firstObservedTime}`);
    console.log(`Last Time: ${person.lastObservedTime}`);
    console.log(`Total Interaction Time: ${minutesPersonInView} minutes`);
    console.log(`Person FPM: ${personFpm}`);
    console.log('**********************************');
    // }
  });
}



module.exports = {
  binPathFromXML,
  labelsPathFromXML,
  showAvailableDevices,
  showInputOutputInfo,
  warning,
  findTimeDifferenceInMinutes,
  findTimeDifferenceInMs,
  logArray,
};