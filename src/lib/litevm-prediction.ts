export const LITE_PREDICTION_ADDR = "0x6A6b2208651b687AfE999bEfDE2da3BFdA9CEc26" as const;

const marketTuple = [
  { name: "id", type: "uint256" },
  { name: "question", type: "string" },
  { name: "yesPool", type: "uint256" },
  { name: "noPool", type: "uint256" },
  { name: "resolvesAt", type: "uint256" },
  { name: "resolved", type: "bool" },
  { name: "outcome", type: "bool" },
  { name: "creator", type: "address" },
] as const;

export const LITE_PREDICTION_ABI = [
  {
    inputs: [], name: "nextId", outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view", type: "function",
  },
  {
    inputs: [{ name: "_id", type: "uint256" }], name: "markets",
    outputs: marketTuple,
    stateMutability: "view", type: "function",
  },
  {
    inputs: [
      { name: "_id", type: "uint256" },
      { name: "_user", type: "address" },
    ], name: "getPrediction",
    outputs: [
      { name: "outcome", type: "bool" },
      { name: "amount", type: "uint256" },
      { name: "claimed", type: "bool" },
    ],
    stateMutability: "view", type: "function",
  },
  {
    inputs: [], name: "getActiveMarkets",
    outputs: [{ type: "tuple[]", components: marketTuple }],
    stateMutability: "view", type: "function",
  },
  {
    inputs: [
      { name: "_question", type: "string" },
      { name: "_resolvesAt", type: "uint256" },
    ], name: "createMarket", outputs: [],
    stateMutability: "nonpayable", type: "function",
  },
  {
    inputs: [
      { name: "_id", type: "uint256" },
      { name: "_outcome", type: "bool" },
    ], name: "predict", outputs: [],
    stateMutability: "payable", type: "function",
  },
  {
    inputs: [
      { name: "_id", type: "uint256" },
      { name: "_outcome", type: "bool" },
    ], name: "resolveMarket", outputs: [],
    stateMutability: "nonpayable", type: "function",
  },
  {
    inputs: [{ name: "_id", type: "uint256" }], name: "claim", outputs: [],
    stateMutability: "nonpayable", type: "function",
  },
] as const;
