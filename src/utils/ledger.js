module.exports = {
  recordTransaction: async (data) => {
    console.log("Ledger record:", data);
    return true;
  }
};
