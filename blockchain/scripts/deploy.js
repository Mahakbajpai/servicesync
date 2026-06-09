const hre = require("hardhat");

async function main() {
  console.log("Deploying BookingAudit smart contract...");

  const BookingAudit = await hre.ethers.getContractFactory("BookingAudit");
  const bookingAudit = await BookingAudit.deploy();

  await bookingAudit.waitForDeployment();

  const address = await bookingAudit.getAddress();
  console.log("--------------------------------------------------");
  console.log(`BookingAudit contract successfully deployed!`);
  console.log(`Address: ${address}`);
  console.log("--------------------------------------------------");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
