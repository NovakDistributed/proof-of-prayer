// What known texts do we have shorthand for?
const KNOWN_TEXTS = {
  "Hail Mary":
`Hail Mary, full of grace,
the Lord is with thee;
blessed art thou amongst women,
and blessed is the fruit of thy womb, Jesus.
Holy Mary, Mother of God,
pray for us sinners,
now and at the hour of our death. Amen.`,
  "Our Father":
`Our Father, Who art in heaven
Hallowed be Thy Name;
Thy kingdom come,
Thy will be done,
on earth as it is in heaven.
Give us this day our daily bread,
and forgive us our trespasses,
as we forgive those who trespass against us;
and lead us not into temptation,
but deliver us from evil. Amen.`
}

// How many hashes can we do per JS tick?
const BIG_BATCH_SIZE = 1000;
const SMALL_BATCH_SIZE = 1;

// Depends on global Sha256 from sha256.js
const Hasher = Sha256;

function hashToHexString(unicodeString) {
  return Hasher.hash(unicodeString);
}

// Returns a promise that resolves to buffer hashed with mixin iterations times.
function hashInRepeatedly(buffer, mixin, iterations) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        // On the next tick, do all the hashing
        var scratch = buffer;
        for (let i = 0; i < iterations; i++) {
          scratch = hashToHexString(buffer + "|" + mixin)
        }
        resolve(scratch);
      } catch (e) {
        reject(e);
      }
    }, 0)
  })
}

// Hash a proof to compute the hash value it ought to have.
// Calls a progress callback with portion complete (0 to 1)
// If the progress callback returns true, aborts.
async function hashProof(proof, progress) {
  // Get the text to be hashed over
  const text = proof['text'] || KNOWN_TEXTS[proof['textId']]
  
  // And the timestamp text
  const timestamp = proof['timestamp']
  
  // And the user nonce
  const petitioner = proof['petitioner']
  
  // And the iteration count
  const count = proof['count']

  // What batch size to use, so we have proper progress for small batches
  const batchSize = count > BIG_BATCH_SIZE ? BIG_BATCH_SIZE : SMALL_BATCH_SIZE

  // How many full batches do we need to make up the requested iteration count?
  const fullBatches = Math.floor(count / batchSize)
  // And how much in the last partial batch?
  const partialBatch = count % batchSize
  
  // Start by hashing the nonce and timestamp
  const base = petitioner + "|" + timestamp + "|" + count
  var hash = hashToHexString(base)
  
  for (let i = 0; i < fullBatches; i++) {
    // Do all the full batches
    hash = await hashInRepeatedly(hash, text, batchSize)
    
    if (progress) {
      // Call the progress callback
      if (progress(i/fullBatches)) {
        // Progress callback says to stop
        return null
      }
    }
  }
  // And then the partial batch, which may be 0
  hash = await hashInRepeatedly(hash, text, partialBatch)
  
  return hash
}

// Given a proof without the hash calculated, calculate and set the hash.
// Return the completed proof.
async function performProof(template, progress) {
  template['hash'] = await hashProof(template, progress)
  return template
}

// Verify a proof.
// Returns an array of true or false and the reason for the determination
async function verifyProof(proof, progress) {
  try {
    // What hash should we expect?
    const expectedHash = proof['hash']
    
    const gotHash = await hashProof(proof, progress)
    
    if (gotHash == expectedHash) {
      // Proof is valid
      return [true, "Proof is valid."]
    } else {
      return [false, "Proof is invalid: expected " + expectedHash + " but got " + gotHash]
    }
  } catch (e) {
    // Proof is misformatted, or something went wrong
    return [false, "Proof is malformed: " + e]
  }
}
