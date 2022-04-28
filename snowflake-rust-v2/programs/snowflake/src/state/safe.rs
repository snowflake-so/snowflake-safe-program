use anchor_lang::prelude::*;

#[account]
#[derive(Default, Debug)]
pub struct Safe {
    pub owners: Vec<Pubkey>,
    pub approvals_required: u8,
    pub creator: Pubkey,
    pub created_at: i64,
    pub signer_nonce: u8,
}

impl Safe {
    pub fn space() -> usize {
        3000
    }

    pub fn is_owner(&self, caller: &Pubkey) -> bool {
        let mut is_owner = false;
        for owner in self.owners.iter() {
            if owner == caller {
                is_owner = true;
            }
        }

        is_owner
    }
}
