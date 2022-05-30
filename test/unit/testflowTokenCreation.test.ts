import { GovernorContract, GovernanceToken, TimeLock, NFTMarketplace } from "../../typechain"
import { deployments, ethers } from "hardhat"
import { assert, expect } from "chai"
import { FUNC, PROPOSAL_DESCRIPTION, VOTING_DELAY, VOTING_PERIOD, MIN_DELAY } from "../../helper-hardhat-config"
import { moveBlocks } from "../../utils/move-block"
import { moveTime } from "../../utils/move-time"
import { BigNumber } from "ethers"

describe("DAO Flow", async () => {
  let governor: GovernorContract
  let governanceToken: GovernanceToken
  let timeLock: TimeLock
  let nftMarketplace: NFTMarketplace
  const price: BigNumber = ethers.utils.parseUnits("1", "ether")
  const voteWay = 1 // Vote: 0 = Against, 1 = For, 2 = Abstain for this example
  const reason = "It is mandatory to have a monkey NFT"
  beforeEach(async () => {
    await deployments.fixture(["all"])
    governor = await ethers.getContract("GovernorContract")
    timeLock = await ethers.getContract("TimeLock")
    governanceToken = await ethers.getContract("GovernanceToken")
    nftMarketplace = await ethers.getContract("NFTMarketplace")
  })

  it("Should revert as the caller is not the owner, the governance is", async function () {
    await expect(nftMarketplace.createToken("https://www.mytokenlocation.com", 1)).to.be.revertedWith("Ownable: caller is not the owner")
  })

  it("Should propose a token creation, vote, wait, queue, and then execute", async () => {
    /* PROPOSE */
    const encodedFunctionCall = nftMarketplace.interface.encodeFunctionData(FUNC, ["https://www.mytokenlocation.com", price])
    const proposeTx = await governor.propose([nftMarketplace.address], [0], [encodedFunctionCall], PROPOSAL_DESCRIPTION)

    const proposeReceipt = await proposeTx.wait(1)
    const proposalId = proposeReceipt.events![0].args!.proposalId
    let proposalState = await governor.state(proposalId)
    console.log(`Current Proposal State: ${proposalState}`)

    await moveBlocks(VOTING_DELAY + 1)

    /* VOTE */
    const voteTx = await governor.castVoteWithReason(proposalId, voteWay, reason)
    await voteTx.wait(1)
    proposalState = await governor.state(proposalId)
    assert.equal(proposalState.toString(), "1")
    console.log(`Current Proposal State: ${proposalState}`)
    await moveBlocks(VOTING_PERIOD + 1)

    /* QUEUE & EXECUTE */
    const descriptionHash = ethers.utils.id(PROPOSAL_DESCRIPTION)
    const queueTx = await governor.queue([nftMarketplace.address], [0], [encodedFunctionCall], descriptionHash)
    await queueTx.wait(1)
    await moveTime(MIN_DELAY + 1)
    await moveBlocks(1)

    proposalState = await governor.state(proposalId)
    console.log(`Current Proposal State: ${proposalState}`)

    console.log("Executing...")
    const exTx = await governor.execute([nftMarketplace.address], [0], [encodedFunctionCall], descriptionHash)
    await exTx.wait(1)
    proposalState = await governor.state(proposalId)
    console.log(`Current Proposal State: ${proposalState}`)
    console.log(await nftMarketplace.fetchMarketItems())
  })
})
