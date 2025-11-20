// questions.js
module.exports = [
    {
      id: 1,
      text: "A trolley is heading towards 5 people tied to the track. You can pull the lever to switch to a track with 1 person.",
      category: "philosophy", // "philosophy", "party", "dark"
      optionPull: { 
        text: "Pull the Lever", 
        impact: { utilitarian: 5, hero: 1, chaos: 0 } 
      },
      optionWait: { 
        text: "Do Nothing", 
        impact: { utilitarian: 0, purist: 5, chaos: 1 } 
      }
    },
    {
      id: 2,
      text: "The trolley is heading towards your Ex-Partner. If you pull the lever, it hits a brand new PS5.",
      category: "party",
      optionPull: { 
        text: "Save the Ex", 
        impact: { saint: 5, simp: 5 } 
      },
      optionWait: { 
        text: "Save the PS5", 
        impact: { capitalist: 3, petty: 5 } 
      }
    },
    {
      id: 3,
      text: "The trolley is heading towards a box containing $1 Million. If you pull the lever, it hits a really cute puppy.",
      category: "dark",
      optionPull: { 
        text: "Hit the Puppy", 
        impact: { capitalist: 5, soulless: 5 } 
      },
      optionWait: { 
        text: "Goodbye Money", 
        impact: { saint: 3, poor: 5 } 
      }
    },
    {
      id: 4,
      text: "Track A has 5 clones of Hitler. Track B has one innocent person who talks during movies.",
      category: "party",
      optionPull: { 
        text: "Hit the Talker", 
        impact: { chaos: 3, moviebuff: 5 } 
      },
      optionWait: { 
        text: "Hit the Clones", 
        impact: { utilitarian: 1, history: 5 } 
      }
    }
  ];