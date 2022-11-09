module.exports = {
    "kty":"RSA",
    "n"  :process.env.STOREKEY01+process.env.STOREKEY02+process.env.STOREKEY03+process.env.STOREKEY04+process.env.STOREKEY05+process.env.STOREKEY06+process.env.STOREKEY07,
    "e"  :process.env.STOREKEY08,
    "d"  :process.env.STOREKEY09+process.env.STOREKEY10+process.env.STOREKEY11+process.env.STOREKEY12+process.env.STOREKEY13+process.env.STOREKEY14+process.env.STOREKEY15,
    "p"  :process.env.STOREKEY16+process.env.STOREKEY17+process.env.STOREKEY18+process.env.STOREKEY19,
    "q"  :process.env.STOREKEY20+process.env.STOREKEY21+process.env.STOREKEY22+process.env.STOREKEY23,
    "dp" :process.env.STOREKEY24+process.env.STOREKEY25+process.env.STOREKEY26+process.env.STOREKEY27,
    "dq" :process.env.STOREKEY28+process.env.STOREKEY29+process.env.STOREKEY30+process.env.STOREKEY31,
    "qi" :process.env.STOREKEY32+process.env.STOREKEY33+process.env.STOREKEY34+process.env.STOREKEY35
}