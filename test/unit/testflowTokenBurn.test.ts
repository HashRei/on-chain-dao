import { GovernorContract, GovernanceToken, TimeLock, NFTMarketplace } from "../../typechain"
import { deployments, ethers } from "hardhat"
import { assert, expect } from "chai"
import { CREATE_FUNC, CREATE_PROPOSAL_DESCRIPTION, BURN_FUNC, BURN_PROPOSAL_DESCRIPTION, VOTING_DELAY, VOTING_PERIOD, MIN_DELAY } from "../../helper-hardhat-config"
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

  it.only("Should propose a token creation, vote, wait, queue, and then execute", async () => {
      
    /* TOKEN CREATION */
    console.log("-------------------------------");
    console.log("TOKEN MINT");

    /* PROPOSE TOKEN CREATION */
    const encodedFunctionCallCreate = nftMarketplace.interface.encodeFunctionData(CREATE_FUNC, ["https://www.mytokenlocation.com", price])
    const proposeTxCreate = await governor.propose([nftMarketplace.address], [0], [encodedFunctionCallCreate], CREATE_PROPOSAL_DESCRIPTION)

    const proposeReceiptCreate = await proposeTxCreate.wait(1)
    const proposalIdCreate = proposeReceiptCreate.events![0].args!.proposalId
    let proposalStateCreate = await governor.state(proposalIdCreate)
    console.log(`Current Proposal State: ${proposalStateCreate}`)

    await moveBlocks(VOTING_DELAY + 1)

    /* VOTE TOKEN CREATION */
    const voteTxCreate = await governor.castVoteWithReason(proposalIdCreate, voteWay, reason)
    await voteTxCreate.wait(1)
    proposalStateCreate = await governor.state(proposalIdCreate)
    assert.equal(proposalStateCreate.toString(), "1")
    console.log(`Current Proposal State: ${proposalStateCreate}`)
    await moveBlocks(VOTING_PERIOD + 1)

    /* QUEUE & EXECUTE TOKEN CREATION */
    const descriptionHashCreate = ethers.utils.id(CREATE_PROPOSAL_DESCRIPTION)
    const queueTxCreate = await governor.queue([nftMarketplace.address], [0], [encodedFunctionCallCreate], descriptionHashCreate)
    await queueTxCreate.wait(1)
    await moveTime(MIN_DELAY + 1)
    await moveBlocks(1)

    proposalStateCreate = await governor.state(proposalIdCreate)
    console.log(`Current Proposal State: ${proposalStateCreate}`)

    console.log("Executing...")
    const exTxCreate = await governor.execute([nftMarketplace.address], [0], [encodedFunctionCallCreate], descriptionHashCreate)
    await exTxCreate.wait(1)
    proposalStateCreate = await governor.state(proposalIdCreate)
    console.log(`Current Proposal State: ${proposalStateCreate}`)
    const nftTokenId = await nftMarketplace.tokenIds()
    console.log("nftTokenId", parseInt(nftTokenId.toString()))
    console.log("-------------------------------");
    /* **************************************************** */

    /* TOKEN BURN */
    console.log("TOKEN BURN");

    /* PROPOSE TOKEN BURN */
    const encodedFunctionCallBurn = nftMarketplace.interface.encodeFunctionData(BURN_FUNC, [nftTokenId])
    const proposeTxBurn = await governor.propose([nftMarketplace.address], [0], [encodedFunctionCallBurn], BURN_PROPOSAL_DESCRIPTION)

    const proposeReceiptBurn = await proposeTxBurn.wait(1)
    const proposalIdBurn = proposeReceiptBurn.events![0].args!.proposalId
    let proposalStateBurn = await governor.state(proposalIdBurn)
    console.log(`Current Proposal State: ${proposalStateBurn}`)

    await moveBlocks(VOTING_DELAY + 1)

    /* VOTE TOKEN CREATION */
    const voteTx = await governor.castVoteWithReason(proposalIdBurn, voteWay, reason)
    await voteTx.wait(1)
    proposalStateBurn = await governor.state(proposalIdBurn)
    assert.equal(proposalStateBurn.toString(), "1")
    console.log(`Current Proposal State: ${proposalStateBurn}`)
    await moveBlocks(VOTING_PERIOD + 1)

    /* QUEUE & EXECUTE TOKEN CREATION */
    const descriptionHash = ethers.utils.id(BURN_PROPOSAL_DESCRIPTION)
    const queueTx = await governor.queue([nftMarketplace.address], [0], [encodedFunctionCallBurn], descriptionHash)
    await queueTx.wait(1)
    await moveTime(MIN_DELAY + 1)
    await moveBlocks(1)

    proposalStateBurn = await governor.state(proposalIdBurn)
    console.log(`Current Proposal State: ${proposalStateBurn}`)

    console.log("Executing...")
    const exTx = await governor.execute([nftMarketplace.address], [0], [encodedFunctionCallBurn], descriptionHash)
    await exTx.wait(1)
    proposalStateBurn = await governor.state(proposalIdBurn)
    console.log(`Current Proposal State: ${proposalStateBurn}`)
    console.log("NFTMarketplace content - should be empty", await nftMarketplace.fetchMarketItems())
  })
})
