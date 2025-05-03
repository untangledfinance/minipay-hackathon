import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const deployValuationModule = buildModule("deployValuationModule", (m) => {
    const vault = "0xC5Ea7410C4B4E9a3DC240c561058a21FB7A208F2"
    const valuationModule = m.contract("Valuation", [vault], {
        id: "ValuationModule2",
    });

    return { valuationModule };

})

export default deployValuationModule;