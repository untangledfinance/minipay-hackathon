import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
const upgradeModule = buildModule("upgradeTreasury", (m) => {
    const bytesLib = m.library("BytesLib");
    const newTreasuryImplentation = m.contract("Treasury", [], {
        libraries: {
            BytesLib: bytesLib
        },
        id: "Treasury1"
    })
    let treasuryAddress = "0x2C9cD919153DB851B5B481057d5d9BBe8F050164";
    const proxyAdmin = m.contractAt("ProxyAdmin", "0x790518555F2839C74454f04707B125FCe091B691", {
        id: "ProxyAdmin1"
    })

    m.call(proxyAdmin, "upgradeAndCall", [treasuryAddress, newTreasuryImplentation, "0x"], {
        from: m.getAccount(0),
    });

    return { proxyAdmin, newTreasuryImplentation }
})

export default upgradeModule;