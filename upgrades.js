module.exports = {
  doubler: {
    name: 'Doubler',
    description: 'Doubler:  Multiplies Point gain by 2!',
    cost: 15,
    execUpgrade: i => i * 2
  },
  'faster gain': {
    name: 'Faster Gain',
    description: 'Faster Gain: Decrease slowmode time to 10 seconds.',
    cost: 30,
    slowmode: true,
    execUpgrade: async m => {
      await m.channel.setRateLimitPerUser(10)
    }
  }
}

/*
"Faster Gain": {
    name: "Faster Gain",
    description: "Faster Gain: Decrease slowmode time to 10 seconds.",
    cost: 200,
    slowmode: true,
    async upgrade(m) {
        await m.channel.setRateLimitPerUser(10)
    }
},

"Doubler II": {
    description: "Doubler II:  Multiplies Point gain by 2!  Spends 50 points.",
    cost: 30
},

"Doubler III": {
    description: "Doubler III:  Multiplies Point gain by 2!  Spends 100 points.",
    cost: 100
},

"Tripler": {
    description: "Tripler:  Triples point gain! Spends 300 points.",
    cost: 300
},

"Even Faster Points": {
    description: "Even Faster Points:  Changes slowmode time to 5 seconds.  Spends 300 points.",
    cost: 300
} */
