-- Defensive integrity constraints for the additive sector ERP foundation.
ALTER TABLE public.hotel_reservations ADD CONSTRAINT hotel_reservations_amounts_nonnegative CHECK (total_amount >= 0 AND deposit_amount >= 0);
ALTER TABLE public.hotel_folio_lines ADD CONSTRAINT hotel_folio_lines_amounts_nonnegative CHECK (quantity >= 0 AND unit_amount >= 0 AND tax_amount >= 0 AND total_amount >= 0);
ALTER TABLE public.hotel_folios ADD CONSTRAINT hotel_folios_amounts_nonnegative CHECK (total_amount >= 0 AND paid_amount >= 0 AND paid_amount <= total_amount);
ALTER TABLE public.school_marks ADD CONSTRAINT school_marks_nonnegative CHECK (marks >= 0);
ALTER TABLE public.school_assessments ADD CONSTRAINT school_assessments_max_marks_positive CHECK (max_marks > 0);
ALTER TABLE public.school_fee_accounts ADD CONSTRAINT school_fee_accounts_amounts_nonnegative CHECK (charges >= 0 AND paid >= 0 AND balance >= 0);
