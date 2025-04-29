import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import deploy from "./deploy";
const upgradeModule = buildModule("upgradeTreasury", (m) => {
    const { proxyAdmin, treasury } = m.useModule(deploy);
    const bytesLib = m.library("BytesLib");
    const newTreasuryImplentation = m.contract("Treasury", [], {
        libraries: {
            BytesLib: bytesLib
        },
        id: "newTreasuryImplentation"
    })

    m.call(proxyAdmin, "upgradeAndCall", [treasury, newTreasuryImplentation, "0x"], {
        from: m.getAccount(0),

    });

    return { proxyAdmin, newTreasuryImplentation }
})

export default upgradeModule;