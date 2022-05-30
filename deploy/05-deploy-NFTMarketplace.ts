import { HardhatRuntimeEnvironment } from "hardhat/types"
import { DeployFunction } from "hardhat-deploy/dist/types"
import { ethers } from "hardhat"

const deployNFTMarketplace: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { getNamedAccounts, deployments } = hre
  const { log, deploy } = deployments
  const { deployer } = await getNamedAccounts()

  log("----------------------------------------------------")
  log("Deploying NFTMarketplace and waiting for confirmations...")
  const nftMarketplace = await deploy("NFTMarketplace", {
    from: deployer,
    args: [],
    log: true // logs will be printed out
  })
  log(`NFTMarketplace at ${nftMarketplace.address}`)
  const nftMarketplaceContract = await ethers.getContractAt("NFTMarketplace", nftMarketplace.address)
  const timeLock = await ethers.getContract("TimeLock")
  const transferTx = await nftMarketplaceContract.transferOwnership(timeLock.address)
  await transferTx.wait(1)
}
export default deployNFTMarketplace
deployNFTMarketplace.tags = ["all", "nftmarketplace"]
