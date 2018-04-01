// This is the backend URL for payments
const BACKEND_URL="https://hfe6icwdi6.execute-api.us-east-2.amazonaws.com/production/charges"
// And this is the Stripe public API key
const STRIPE_KEY="pk_live_nLJ24ir1ML9CkYL2vRh7XDuq"
// This is the price
// Anyone hacking about with this can just hack their way to free premium features anyway
const PRICE_IN_CENTS = 500
const CURRENCY = "USD"
// Where do you need to be premium?
const PREMIUM_CUTOFF = 1000

// Premium is not going to work if people are not always on the same domain and protocol
const CORRECT_URL="https://proofofprayer.org"
const CORRECT_PROTOCOL = "https:"
const CORRECT_DOMAIN = "proofofprayer.org"

// Find the form to set up praying
const prayForm = document.getElementById("prayForm")
const prayButton = document.getElementById("pray")
const idField = document.getElementById("textId")
const textField = document.getElementById("text")
const nameField = document.getElementById("name")
const countField = document.getElementById("count")

// And the premium feature logic
const premiumOffer = document.getElementById("premiumOffer")
const premiumThanks = document.getElementById("premiumThanks")
const buyButton = document.getElementById("buyButton")

// And the waiting slide
const prayWait = document.getElementById("prayWait")
const prayProgress = document.getElementById("prayProgress")

// And the done slide
const prayDone = document.getElementById("prayDone")
const outText = document.getElementById("output")
const prayAgain = document.getElementById("prayAgain")

// And the verification form
const verifyForm = document.getElementById("verifyForm")
const proofField = document.getElementById("proof")
const verifyButton = document.getElementById("verify")

// And its waiting slide
const verifyWait = document.getElementById("verifyWait")
const verifyProgress = document.getElementById("verifyProgress")

// And its done slide
const verifyDone = document.getElementById("verifyDone")
const verdictText = document.getElementById("verdict")
const verifyAgain = document.getElementById("verifyAgain")

function ensureCorrectDomain() {
  if (window.location.protocol != "file:") {
    if (window.location.protocol != CORRECT_PROTOCOL || window.location.hostname != CORRECT_DOMAIN) {
      // Go to the right URL
      window.location = CORRECT_URL
    }
  }
}

// Define functions to show and hide collapsing elements.
// Only work on collapse-class elements
function showCollapse(element) {
  element.classList.add("show")
}
function hideCollapse(element) {
  element.classList.remove("show")
}

// Define some functions to change slides
function showPrayForm() {
  showCollapse(prayForm)
  hideCollapse(prayWait)
  hideCollapse(prayDone)
}
function showPrayWait() {
  hideCollapse(prayForm)
  showCollapse(prayWait)
  hideCollapse(prayDone)
}
function showPrayDone() {
  hideCollapse(prayForm)
  hideCollapse(prayWait)
  showCollapse(prayDone)
}

function showVerifyForm() {
  showCollapse(verifyForm)
  hideCollapse(verifyWait)
  hideCollapse(verifyDone)
}
function showVerifyWait() {
  hideCollapse(verifyForm)
  showCollapse(verifyWait)
  hideCollapse(verifyDone)
}
function showVerifyDone() {
  hideCollapse(verifyForm)
  hideCollapse(verifyWait)
  showCollapse(verifyDone)
}

// Update a Bootstrap progress bar
function setProgress(element, percent) {
  element.setAttribute("aria-valuenow", percent)
  element.style.width = percent + "%"
  element.innerText = percent + "%"
}

// Save premium-ness to the browser and turn on premium features
function enablePremium() {
  localStorage.setItem("premium", true)
  applyPremium()
}

// Make the page reflect premium features being enabled
function applyPremium() {
  showCollapse(premiumThanks)
  stopOffer()
}

// Decide if we are premium or not
function isPremium() {
  return localStorage.getItem("premium") || false
}

// Show the premium offer box
function offerPremium() {
  showCollapse(premiumOffer)
  hideCollapse(prayButton)
  prayButton.disabled = true
}

// And hide it again
function stopOffer() {
  hideCollapse(premiumOffer)
  showCollapse(prayButton)
  prayButton.disabled = false
}

// Define Stripe for premium features
const stripeHandler = StripeCheckout.configure({
  key: STRIPE_KEY,
  image: "https://stripe.com/img/documentation/checkout/marketplace.png",
  locale: "auto",
  token: function(token) {
    fetch(BACKEND_URL, {
      method: "POST",
      body: JSON.stringify({
        token,
        charge: {
          amount: PRICE_IN_CENTS,
          currency: CURRENCY
        }
      })
    }).then(() => {
      // Now premium should be on
      enablePremium()
    })
  }
})
   
function setup() {
  
  ensureCorrectDomain()
  
  // Clear out browser cruft
  proofField.value = ""
  nameField.value = ""
  textField.value = ""
  countField.value = 1
  
  if(isPremium()) {
    // Show that the user is premium
    applyPremium()
  }
  
  for (let key of Object.keys(KNOWN_TEXTS)) {
    const newOption = document.createElement("option")
    newOption.value = key
    newOption.innerText = key
    idField.appendChild(newOption)
  }
  textField.value = KNOWN_TEXTS[idField.value]
  textField.disabled = true
  
  // Add a custom option at the end
  const customOption = document.createElement("option")
  customOption.value = "custom"
  customOption.innerText = "Custom Prayer"
  idField.appendChild(customOption)
  
  idField.addEventListener("change", () => {
    if (idField.value == "custom") {
      textField.disabled = false
      textField.value = ""
    } else { 
      textField.disabled = true
      textField.value = KNOWN_TEXTS[idField.value]
    }
  })
  
  nameField.addEventListener("change", () => {
    if (nameField.value == "") {
      // Name is required
      nameField.setCustomValidity("Please specifiy a name")
      return
    } else {
      // You have a name so it is valid
      nameField.setCustomValidity("")
    }
  })
  
  count.addEventListener("change", () => {
    if (countField.value >= PREMIUM_CUTOFF && !isPremium()) {
      offerPremium()
    } else {
      stopOffer()
    }
  })
  
  buyButton.addEventListener("click", () => {
    stripeHandler.open({
      name: 'Novak Distributed',
      description: 'Premium Prayer Feature Access',
      amount: PRICE_IN_CENTS
    });
  })

  window.addEventListener("popstate", function() {
    stripeHandler.close();
  });
  
  prayButton.addEventListener("click", (e) => {
    e.preventDefault()
    
    if (countField.value >= PREMIUM_CUTOFF && !isPremium()) {
      // Not premium, can't do
      return
    }
    
    if (nameField.value == "") {
      // Name is required
      nameField.setCustomValidity("Please specifiy a name")
      return
    } else {
      // You have a name so it is valid
      nameField.setCustomValidity("")
    }
  
    // Start waiting
    showPrayWait()
    
    // Compose the proof
    var proof = {}
    if (textField.disabled) {
      proof['textId'] = idField.value
    } else {
      proof['text'] = textField.value
    }
    proof['petitioner'] = nameField.value
    proof['timestamp'] = (new Date()).toLocaleString()
    proof['count'] = parseInt(countField.value)

    outText.classList.remove("done")
    outText.classList.remove("error")

    // Start the computation
    let promise = performProof(proof, (progress) => {
      setProgress(prayProgress, (100 * progress).toFixed(1))
    })
    
    // When it is done, spit it out
    promise.then((completeProof) => {
      outText.innerText = JSON.stringify(completeProof)
      outText.classList.add("done")
      
      showPrayDone();
    }).catch((err) => {
      // Handle errors
      outText.innerText = "Error: " + JSON.stringify(err)
      outText.classList.add("error")
      
      showPrayDone()
    })
    
  })
  
  outText.addEventListener("click", () => {
    window.getSelection().selectAllChildren(outText);
  })
  
  prayAgain.addEventListener("click", () => {
    showPrayForm()
  })
  
  proofField.addEventListener("click", () => {
    proofField.select();
  })
  
  verifyButton.addEventListener("click", (e) => {
    e.preventDefault()
    if (proofField.value == "") {
      // Skip empty fields
      return
    }
    
    // Start waiting
    showVerifyWait()
    
    try {
    
      // Read the proof
      var proof = JSON.parse(proofField.value)
      
      verdictText.classList.remove("invalid")
      verdictText.classList.remove("valid")
      
      // Start the computation
      let promise = verifyProof(proof, (progress) => {
        setProgress(verifyProgress, (100 * progress).toFixed(1))
      })
      
      // When it is done, spit it out
      promise.then((result) => {
        // Say if it's good or not
        if (result[0]) {
          verdictText.classList.add("valid")
          verdictText.innerText = `This proof is valid!

This valid proof certifies that the following prayer was prayed ${proof['count']} time(s) by ${proof['petitioner']} on ${proof['timestamp']}:

${proof['text'] || KNOWN_TEXTS[proof['textId']]}
`
        } else {
          verdictText.classList.add("invalid")
          verdictText.innerText = result[1]
        }
        
        showVerifyDone()
      }).catch((err) => {
        // Handle errors
        verdictText.classList.add("invalid")
        verdictText.innerText = "Proof is invalid: " + err
        
        showVerifyDone()
      })
    } catch (e) {
        // Handle errors more
        verdictText.classList.add("invalid")
        verdictText.classList.remove("valid")
        verdictText.innerText = "Proof is invalid: " + e
        
        showVerifyDone()
    }
    
  })
  
  verifyAgain.addEventListener("click", () => {
    showVerifyForm()
  })
}

setup()
