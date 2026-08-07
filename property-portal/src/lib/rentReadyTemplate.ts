/**
 * Default legal / compliance steps to take a property from takeover to
 * rent-ready. Seeded into every new property's checklist; the manager can
 * add, complete, or remove steps per property since requirements vary by
 * city, county, and state.
 */
export const RENT_READY_TEMPLATE: { title: string; description: string }[] = [
  {
    title: "Verify deed and clear title",
    description: "Confirm recorded deed, ownership entity, and that no liens or encumbrances block renting.",
  },
  {
    title: "Confirm zoning and rental eligibility",
    description: "Check local zoning allows the intended rental use (single-family, multi-unit, short/long term).",
  },
  {
    title: "Register rental / obtain rental license",
    description: "File rental registration or landlord license with the city or county where required.",
  },
  {
    title: "Place landlord insurance in force",
    description: "Landlord/dwelling-fire policy with liability coverage; name management company as additional insured.",
  },
  {
    title: "Confirm property taxes are current",
    description: "Verify no delinquent property taxes; note any homestead exemption that must be removed.",
  },
  {
    title: "Pass habitability / code inspection",
    description: "Address building-code and habitability requirements (heat, water, electrical, egress, pests).",
  },
  {
    title: "Install and certify smoke & CO detectors",
    description: "Meet state placement rules; document with dated photos or inspection certificate.",
  },
  {
    title: "Prepare lead-based paint disclosure",
    description: "Required for homes built before 1978: EPA pamphlet plus signed disclosure form.",
  },
  {
    title: "Obtain certificate of occupancy / rental permit",
    description: "Where required, secure the CO or rental permit after inspection.",
  },
  {
    title: "Complete repairs & renovation to code",
    description: "Finish the renovation scope; all permitted work signed off by inspectors.",
  },
  {
    title: "Set up security deposit account",
    description: "Open the escrow/trust account for deposits as required by state law; document interest rules.",
  },
  {
    title: "Draft state-compliant lease agreement",
    description: "Lease with all required disclosures, addenda, and local clauses reviewed for the jurisdiction.",
  },
  {
    title: "Transfer and verify utilities",
    description: "Utilities in the correct name, active for showings, and billing responsibility defined for the lease.",
  },
  {
    title: "Final walkthrough & condition report",
    description: "Dated photo/video record of condition, keys and access inventoried — property is rent ready.",
  },
];
