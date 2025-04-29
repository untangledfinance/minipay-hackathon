import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const deploy = buildModule("deploy", (m) => {
    const bytesLib = m.library("BytesLib");
    const treasuryImplentation = m.contract("Treasury", [], {
        libraries: {
            BytesLib: bytesLib
        }
    })

    const proxyAdminOwner = m.getAccount(0);
    const initializationCall = m.encodeFunctionCall(treasuryImplentation, "initialize", ["0xcebA9300f2b948710d2653dD7B07f33A8B32118C"])
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

    const vault = m.contract("Vault", ["0xcebA9300f2b948710d2653dD7B07f33A8B32118C", "MiniPay Beta Vault", "mpb", treasury]);

    const treasuryInstance = m.contractAt("Treasury", treasury, { id: "treasuryInstance" })

    m.call(treasuryInstance, "setVault", [vault]);

    return { treasury, proxyAdmin };
});

export default deploy;

