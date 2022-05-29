import { HardhatRuntimeEnvironment } from "hardhat/types"
import { DeployFunction } from "hardhat-deploy/dist/types"
import { ADDRESS_ZERO } from "../helper-hardhat-config"
import { ethers } from "hardhat"

const deployGovenorContract: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { getNamedAccounts, deployments } = hre
    const { log } = deployments
    const { deployer } = await getNamedAccounts()
    const timeLock = await ethers.getContract("TimeLock", deployer)
    const governor = await ethers.getContract("GovernorContract", deployer)

    log("----------------------------------------------------")
    log("Setting up contracts for roles...")
    const proposerRole = await timeLock.PROPOSER_ROLE()
    const executorRole = await timeLock.EXECUTOR_ROLE()
    const adminRole = await timeLock.TIMELOCK_ADMIN_ROLE()

  // Role fixing
  const proposerTx = await timeLock.grantRole(proposerRole, governor.address)
  await proposerTx.wait(1)
  const executorTx = await timeLock.grantRole(executorRole, ADDRESS_ZERO) // Means everybody can execute 
  await executorTx.wait(1)
  const revokeTx = await timeLock.revokeRole(adminRole, deployer) // Revoke the admin role from deployer, nobody owns timeLock controller now
  await revokeTx.wait(1)
}

export default deployGovenorContract