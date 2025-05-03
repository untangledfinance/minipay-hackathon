import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { ethers } from "hardhat"

const USDC = "0xcebA9300f2b948710d2653dD7B07f33A8B32118C";
const stableOracle = "0xA0deb61310006494620ecA6A74e5e338682173d3";
const aUSDC = "0xFF8309b9e99bfd2D4021bc71a362aBD93dBd4785";
const USDyc = "0x2A68c98bD43AA24331396F29166aeF2Bfd51343f";
const deploy = buildModule("deploy", (m) => {
    const bytesLib = m.library("BytesLib");
    const treasuryImplentation = m.contract("Treasury", [], {
        libraries: {
            BytesLib: bytesLib
        }
    })

    const proxyAdminOwner = m.getAccount(0);
    const initializationCall = m.encodeFunctionCall(treasuryImplentation, "initialize", [USDC])
    const treasury = m.contract("TransparentUpgradeableProxy", [
        treasuryImplentation,
        proxyAdminOwner,
        initializationCall,
    ]);

    const proxyAdminAddress = m.readEventArgument(
        treasury,
        "AdminChanged",
        "newAdmin"
    )

    const proxyAdmin = m.contractAt("ProxyAdmin", proxyAdminAddress);

    const vault = m.contract("Vault", [USDC, "MiniPay Vault", "MPV", treasury]);

    const valuationModule = m.contract("Valuation", [vault]);

    const treasuryInstance = m.contractAt("Treasury", treasury, { id: "treasuryInstance" })

    m.call(treasuryInstance, "setVault", [vault]);
    m.call(treasuryInstance, "setValuationModule", [valuationModule]);

    return { treasury, proxyAdmin };
});

export default deploy;

