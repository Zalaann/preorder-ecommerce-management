-- Automatic Payment Trigger Function
-- This trigger automatically creates or updates payment records when preorder_items are modified
-- It tracks advance payments for individual products

CREATE OR REPLACE FUNCTION public.update_payments_on_preorder_item_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
DECLARE
    v_customer_id TEXT;
    v_preorder_id TEXT;
    v_payment_id TEXT;
    v_existing_payment_id TEXT;
BEGIN
    -- Get customer_id and preorder_id
    SELECT p.customer_id, p.preorder_id
    INTO v_customer_id, v_preorder_id
    FROM preorders p
    WHERE p.preorder_id = NEW.preorder_id;

    -- Generate a unique payment_id
    v_payment_id := gen_random_uuid();

    -- Check if an existing payment for this preorder_item_id exists
    SELECT payment_id INTO v_existing_payment_id
    FROM payments
    WHERE preorder_item_id = NEW.preorder_item_id AND is_automatic = TRUE;

    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        -- Only proceed if there's an advance payment to track
        IF NEW.advance_payment IS NOT NULL AND NEW.advance_payment > 0 THEN
            -- If an existing payment exists, update it
            IF v_existing_payment_id IS NOT NULL THEN
                UPDATE payments
                SET
                    customer_id = v_customer_id,
                    preorder_id = v_preorder_id,
                    amount = NEW.advance_payment,
                    payment_purpose = 'advance',
                    payment_date = CURRENT_DATE,
                    preorder_item_id = NEW.preorder_item_id,
                    advance_payment = NEW.advance_payment,
                    is_automatic = TRUE
                WHERE payment_id = v_existing_payment_id;
            ELSE
                -- Otherwise, insert a new payment record
                INSERT INTO payments (
                    payment_id,
                    customer_id,
                    preorder_id,
                    amount,
                    payment_purpose,
                    payment_date,
                    preorder_item_id,
                    bank_account,
                    tally,
                    payment_screenshot,
                    advance_payment,
                    is_automatic
                ) VALUES (
                    v_payment_id,
                    v_customer_id,
                    v_preorder_id,
                    NEW.advance_payment,
                    'advance',
                    CURRENT_DATE,
                    NEW.preorder_item_id,
                    'HBL',
                    FALSE,
                    '',
                    NEW.advance_payment,
                    TRUE
                );
            END IF;
        ELSIF v_existing_payment_id IS NOT NULL THEN
            -- If advance_payment is 0 or NULL and we have an existing payment, delete it
            DELETE FROM payments
            WHERE payment_id = v_existing_payment_id;
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        -- If a preorder item is deleted, delete the corresponding payment (if any)
        IF v_existing_payment_id IS NOT NULL THEN
            DELETE FROM payments
            WHERE payment_id = v_existing_payment_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$function$;

-- Create the trigger if it doesn't exist
DROP TRIGGER IF EXISTS trigger_update_payments_on_preorder_item_change ON preorder_items;
CREATE TRIGGER trigger_update_payments_on_preorder_item_change
AFTER INSERT OR UPDATE OR DELETE ON preorder_items
FOR EACH ROW
EXECUTE FUNCTION update_payments_on_preorder_item_change(); 