use anchor_lang::prelude::*;

#[account]
#[derive(Default, Debug)]
pub struct Safe {
    pub approvals_required: u8,
    pub creator: Pubkey,
    pub created_at: i64,
    pub signer_nonce: u8,
    pub owner_set_seqno: u8,
    pub extra: String,
    pub owners: Vec<Pubkey>,
}

impl Safe {
    pub const MAX_OWNERS: u8 = 64;

    pub fn space(max_owners: u8) -> usize {
        8 // Anchor account discriminator
        + std::mem::size_of::<Safe>()
        + 4 // Vec discriminator
        + std::mem::size_of::<Pubkey>() * (max_owners as usize)
    }

    pub fn is_owner(&self, caller: &Pubkey) -> bool {
        self.owners
            .iter()
            .position(|pubkey| pubkey == caller)
            .is_some()
    }
}
