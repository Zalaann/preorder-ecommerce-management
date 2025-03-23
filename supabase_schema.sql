--
-- PostgreSQL database dump
--

-- Dumped from database version 15.8
-- Dumped by pg_dump version 15.12 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: bank_account; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.bank_account AS ENUM (
    'HBL',
    'Meezan',
    'JazzCash',
    'EasyPaisa'
);


--
-- Name: confirmation_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.confirmation_status_enum AS ENUM (
    'Not Confirmed',
    'Confirmed'
);


--
-- Name: order_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.order_status AS ENUM (
    'pending',
    'ordered',
    'shipped',
    'delivered',
    'cancelled',
    'Out_of_stock'
);


--
-- Name: pay_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.pay_status_enum AS ENUM (
    'Paid',
    'Unpaid'
);


--
-- Name: payment_purpose; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.payment_purpose AS ENUM (
    'advance',
    'final_remaining',
    'cod'
);


--
-- Name: shipment_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.shipment_status AS ENUM (
    'scheduled',
    'in_transit',
    'arrived',
    'delayed'
);


--
-- Name: create_label_on_request(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_label_on_request() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    INSERT INTO labels (order_id, flight_id, customer_name, address, phone_number, flight_name)
    SELECT 
        NEW.id, NEW.flight_id, c.name, c.address, c.phone_number, f.flight_name
    FROM customers c
    LEFT JOIN flights f ON NEW.flight_id = f.id
    WHERE c.id = (SELECT customer_id FROM preorders WHERE id = NEW.order_id);
    RETURN NEW;
END;
$$;


--
-- Name: generate_custom_id(text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_custom_id(table_name text, column_name text, prefix text) RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
    latest_id TEXT;
    new_id TEXT;
    numeric_part INT;
BEGIN
    -- Fetch latest ID from the given table & column
    EXECUTE format(
        'SELECT %I FROM %I WHERE %I LIKE %L ORDER BY %I DESC LIMIT 1',
        column_name, table_name, column_name, prefix || '-%', column_name
    ) INTO latest_id;

    -- Extract numeric part and increment
    IF latest_id IS NOT NULL THEN
        numeric_part := CAST(SUBSTRING(latest_id FROM '[0-9]+') AS INT) + 1;
    ELSE
        numeric_part := 1; -- Start from 1 if no record exists
    END IF;

    -- Format new ID with leading zeros (e.g., PRE-00001)
    new_id := prefix || '-' || LPAD(numeric_part::TEXT, 5, '0');

    RETURN new_id;
END;
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.users (user_id, email, role, name)
  VALUES (
    new.id, 
    new.email, 
    'employee', 
    COALESCE(
      (new.raw_user_meta_data->>'name'),
      split_part(new.email, '@', 1)
    )
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN new;
END;
$$;


--
-- Name: normalize_phone_number(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.normalize_phone_number(phone text) RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
    formatted_phone TEXT;
BEGIN
    -- Remove spaces, dashes, and non-numeric characters
    phone := regexp_replace(phone, '[^0-9]', '', 'g');

    -- If the number starts with '0092', replace it with '+92'
    IF phone LIKE '0092%' THEN
        formatted_phone := '+92' || substring(phone FROM 5);
    
    -- If the number starts with '92', assume it's missing '+'
    ELSIF phone LIKE '92%' THEN
        formatted_phone := '+92' || substring(phone FROM 3);

    -- If the number starts with '03', replace it with '+92'
    ELSIF phone LIKE '03%' THEN
        formatted_phone := '+92' || substring(phone FROM 2);

    -- If the number starts with '3', assume it's missing '+92'
    ELSIF phone LIKE '3%' THEN
        formatted_phone := '+92' || phone;

    -- If none of the above, return as is
    ELSE
        formatted_phone := phone;
    END IF;

    -- Ensure phone number is not longer than the typical length (e.g., 13 digits)
    IF length(formatted_phone) > 13 THEN
        formatted_phone := substring(formatted_phone FROM 1 FOR 13);
    END IF;

    RETURN formatted_phone;
END;
$$;


--
-- Name: set_customer_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_customer_id() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Generate a new customer_id if not provided
    IF NEW.customer_id IS NULL THEN
        NEW.customer_id := generate_custom_id('customers', 'customer_id', 'CUST');
    END IF;
    
    RETURN NEW;
END;
$$;


--
-- Name: set_payment_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_payment_id() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Generate a new payment_id if not provided
    IF NEW.payment_id IS NULL THEN
        NEW.payment_id := generate_custom_id('payments', 'payment_id', 'PAY');
    END IF;
    
    RETURN NEW;
END;
$$;


--
-- Name: set_preorder_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_preorder_id() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Generate a new preorder_id if not provided
    IF NEW.preorder_id IS NULL THEN
        NEW.preorder_id := generate_custom_id('preorders', 'preorder_id', 'PRE');
    END IF;
    
    RETURN NEW;
END;
$$;


--
-- Name: update_product_details(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_product_details() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    details TEXT;
BEGIN
    -- Aggregate product details for the preorder, including shade, size, quantity, and link
    SELECT STRING_AGG(
        CONCAT_WS(' | ', product_name, COALESCE(shade, 'N/A'), COALESCE(size, 'N/A'), quantity, COALESCE(link, 'N/A')), 
        ', '
    ) INTO details
    FROM preorder_items
    WHERE preorder_id = NEW.preorder_id;

    -- Update the product_details in preorders
    UPDATE preorders
    SET product_details = details
    WHERE preorder_id = NEW.preorder_id;

    RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: customers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customers (
    customer_id text NOT NULL,
    name text NOT NULL,
    instagram_id text NOT NULL,
    phone_number text NOT NULL,
    city text NOT NULL,
    address text NOT NULL
);


--
-- Name: flights; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.flights (
    flight_id uuid DEFAULT gen_random_uuid() NOT NULL,
    flight_name text NOT NULL,
    shipment_date date NOT NULL,
    status public.shipment_status DEFAULT 'scheduled'::public.shipment_status
);


--
-- Name: labels; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.labels (
    label_id uuid DEFAULT gen_random_uuid() NOT NULL,
    preorder_id text,
    flight_id uuid,
    customer_name text NOT NULL,
    address text NOT NULL,
    phone_number text NOT NULL,
    flight_name text,
    created_at timestamp without time zone DEFAULT now(),
    created_by uuid
);


--
-- Name: payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payments (
    payment_id text NOT NULL,
    customer_id text,
    preorder_id text,
    amount numeric(10,2) NOT NULL,
    payment_purpose public.payment_purpose,
    bank_account text,
    tally boolean DEFAULT false,
    payment_screenshot text,
    payment_date timestamp without time zone DEFAULT now(),
    CONSTRAINT check_positive_amount CHECK ((amount >= (0)::numeric))
);


--
-- Name: preorder_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.preorder_items (
    preorder_item_id uuid DEFAULT gen_random_uuid() NOT NULL,
    preorder_id text,
    product_name text NOT NULL,
    shade text,
    size text,
    quantity integer NOT NULL,
    link text,
    price numeric,
    CONSTRAINT preorder_items_quantity_check CHECK ((quantity > 0))
);


--
-- Name: preorders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.preorders (
    preorder_id text NOT NULL,
    customer_id text,
    flight_id uuid,
    order_status public.order_status DEFAULT 'pending'::public.order_status,
    subtotal numeric(10,2) NOT NULL,
    advance_payment numeric(10,2) NOT NULL,
    cod_amount numeric(10,2) NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    total_amount numeric(10,2),
    remaining_amount numeric(10,2) DEFAULT 0,
    add_reminder boolean DEFAULT false,
    CONSTRAINT check_positive_advance_payment CHECK ((advance_payment >= (0)::numeric)),
    CONSTRAINT check_positive_cod_amount CHECK ((cod_amount >= (0)::numeric)),
    CONSTRAINT check_positive_subtotal CHECK ((subtotal >= (0)::numeric))
);


--
-- Name: reminders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reminders (
    reminder_id uuid DEFAULT gen_random_uuid() NOT NULL,
    preorder_id text,
    user_id uuid,
    title text NOT NULL,
    description text,
    status text DEFAULT 'Pending'::text,
    priority text DEFAULT 'Medium'::text,
    due_date timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    CONSTRAINT reminders_priority_check CHECK ((priority = ANY (ARRAY['Low'::text, 'Medium'::text, 'High'::text, 'Urgent'::text]))),
    CONSTRAINT reminders_status_check CHECK ((status = ANY (ARRAY['Pending'::text, 'In Progress'::text, 'Completed'::text])))
);


--
-- Name: transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transactions (
    transaction_id integer NOT NULL,
    user_id uuid,
    transaction_date date NOT NULL,
    due_date date NOT NULL,
    amount numeric NOT NULL,
    brand text NOT NULL,
    confirmation_status public.confirmation_status_enum DEFAULT 'Not Confirmed'::public.confirmation_status_enum NOT NULL,
    pay_status public.pay_status_enum DEFAULT 'Unpaid'::public.pay_status_enum NOT NULL,
    remarks text,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_by uuid,
    change_description text
);


--
-- Name: transactions_transaction_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.transactions_transaction_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: transactions_transaction_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.transactions_transaction_id_seq OWNED BY public.transactions.transaction_id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    user_id uuid NOT NULL,
    name text,
    email text NOT NULL,
    password text,
    role text DEFAULT 'employee'::text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: transactions transaction_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions ALTER COLUMN transaction_id SET DEFAULT nextval('public.transactions_transaction_id_seq'::regclass);


--
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (customer_id);


--
-- Name: flights flights_flight_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flights
    ADD CONSTRAINT flights_flight_name_key UNIQUE (flight_name);


--
-- Name: flights flights_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flights
    ADD CONSTRAINT flights_pkey PRIMARY KEY (flight_id);


--
-- Name: labels labels_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.labels
    ADD CONSTRAINT labels_pkey PRIMARY KEY (label_id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (payment_id);


--
-- Name: preorder_items preorder_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.preorder_items
    ADD CONSTRAINT preorder_items_pkey PRIMARY KEY (preorder_item_id);


--
-- Name: preorders preorders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.preorders
    ADD CONSTRAINT preorders_pkey PRIMARY KEY (preorder_id);


--
-- Name: reminders reminders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reminders
    ADD CONSTRAINT reminders_pkey PRIMARY KEY (reminder_id);


--
-- Name: transactions transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (transaction_id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (user_id);


--
-- Name: idx_customer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_id ON public.preorders USING btree (customer_id);


--
-- Name: idx_customer_id_payments; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_id_payments ON public.payments USING btree (customer_id);


--
-- Name: idx_customers_composite_search; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customers_composite_search ON public.customers USING btree (name, phone_number, instagram_id);


--
-- Name: idx_customers_instagram_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customers_instagram_id ON public.customers USING btree (instagram_id);


--
-- Name: idx_customers_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customers_name ON public.customers USING gin (name public.gin_trgm_ops);


--
-- Name: idx_customers_phone_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customers_phone_number ON public.customers USING btree (phone_number);


--
-- Name: idx_flight_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_flight_id ON public.preorders USING btree (flight_id);


--
-- Name: idx_flights_composite_search; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_flights_composite_search ON public.flights USING btree (status, shipment_date);


--
-- Name: idx_flights_flight_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_flights_flight_name ON public.flights USING btree (flight_name);


--
-- Name: idx_flights_shipment_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_flights_shipment_date ON public.flights USING btree (shipment_date);


--
-- Name: idx_flights_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_flights_status ON public.flights USING btree (status);


--
-- Name: idx_payments_composite_search; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_composite_search ON public.payments USING btree (customer_id, preorder_id, tally, payment_date);


--
-- Name: idx_payments_customer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_customer_id ON public.payments USING btree (customer_id);


--
-- Name: idx_payments_preorder_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_preorder_id ON public.payments USING btree (preorder_id);


--
-- Name: idx_payments_tally; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_tally ON public.payments USING btree (tally);


--
-- Name: idx_preorder_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_preorder_id ON public.payments USING btree (preorder_id);


--
-- Name: idx_preorders_composite_search; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_preorders_composite_search ON public.preorders USING btree (order_status, flight_id, created_at);


--
-- Name: idx_preorders_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_preorders_created_at ON public.preorders USING btree (created_at);


--
-- Name: idx_preorders_customer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_preorders_customer_id ON public.preorders USING btree (customer_id);


--
-- Name: idx_preorders_flight_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_preorders_flight_id ON public.preorders USING btree (flight_id);


--
-- Name: idx_preorders_order_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_preorders_order_status ON public.preorders USING btree (order_status);


--
-- Name: customers trigger_set_customer_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_set_customer_id BEFORE INSERT ON public.customers FOR EACH ROW EXECUTE FUNCTION public.set_customer_id();


--
-- Name: payments trigger_set_payment_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_set_payment_id BEFORE INSERT ON public.payments FOR EACH ROW EXECUTE FUNCTION public.set_payment_id();


--
-- Name: preorders trigger_set_preorder_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_set_preorder_id BEFORE INSERT ON public.preorders FOR EACH ROW EXECUTE FUNCTION public.set_preorder_id();


--
-- Name: labels labels_flight_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.labels
    ADD CONSTRAINT labels_flight_id_fkey FOREIGN KEY (flight_id) REFERENCES public.flights(flight_id) ON DELETE CASCADE;


--
-- Name: labels labels_preorder_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.labels
    ADD CONSTRAINT labels_preorder_id_fkey FOREIGN KEY (preorder_id) REFERENCES public.preorders(preorder_id);


--
-- Name: payments payments_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(customer_id) ON DELETE CASCADE;


--
-- Name: payments payments_preorder_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_preorder_id_fkey FOREIGN KEY (preorder_id) REFERENCES public.preorders(preorder_id) ON DELETE CASCADE;


--
-- Name: preorder_items preorder_items_preorder_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.preorder_items
    ADD CONSTRAINT preorder_items_preorder_id_fkey FOREIGN KEY (preorder_id) REFERENCES public.preorders(preorder_id) ON DELETE CASCADE;


--
-- Name: preorders preorders_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.preorders
    ADD CONSTRAINT preorders_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(customer_id) ON DELETE CASCADE;


--
-- Name: preorders preorders_flight_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.preorders
    ADD CONSTRAINT preorders_flight_id_fkey FOREIGN KEY (flight_id) REFERENCES public.flights(flight_id) ON DELETE SET NULL;


--
-- Name: reminders reminders_preorder_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reminders
    ADD CONSTRAINT reminders_preorder_id_fkey FOREIGN KEY (preorder_id) REFERENCES public.preorders(preorder_id) ON DELETE CASCADE;


--
-- Name: reminders reminders_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reminders
    ADD CONSTRAINT reminders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: transactions transactions_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(user_id);


--
-- Name: transactions transactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: users users_auth_user_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_auth_user_id_fk FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: users Allow all operations for now; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all operations for now" ON public.users USING (true);


--
-- Name: users; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: -
--

GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;


--
-- Name: FUNCTION create_label_on_request(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.create_label_on_request() TO anon;
GRANT ALL ON FUNCTION public.create_label_on_request() TO authenticated;
GRANT ALL ON FUNCTION public.create_label_on_request() TO service_role;


--
-- Name: FUNCTION generate_custom_id(table_name text, column_name text, prefix text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.generate_custom_id(table_name text, column_name text, prefix text) TO anon;
GRANT ALL ON FUNCTION public.generate_custom_id(table_name text, column_name text, prefix text) TO authenticated;
GRANT ALL ON FUNCTION public.generate_custom_id(table_name text, column_name text, prefix text) TO service_role;


--
-- Name: FUNCTION handle_new_user(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.handle_new_user() TO anon;
GRANT ALL ON FUNCTION public.handle_new_user() TO authenticated;
GRANT ALL ON FUNCTION public.handle_new_user() TO service_role;


--
-- Name: FUNCTION normalize_phone_number(phone text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.normalize_phone_number(phone text) TO anon;
GRANT ALL ON FUNCTION public.normalize_phone_number(phone text) TO authenticated;
GRANT ALL ON FUNCTION public.normalize_phone_number(phone text) TO service_role;


--
-- Name: FUNCTION set_customer_id(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.set_customer_id() TO anon;
GRANT ALL ON FUNCTION public.set_customer_id() TO authenticated;
GRANT ALL ON FUNCTION public.set_customer_id() TO service_role;


--
-- Name: FUNCTION set_payment_id(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.set_payment_id() TO anon;
GRANT ALL ON FUNCTION public.set_payment_id() TO authenticated;
GRANT ALL ON FUNCTION public.set_payment_id() TO service_role;


--
-- Name: FUNCTION set_preorder_id(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.set_preorder_id() TO anon;
GRANT ALL ON FUNCTION public.set_preorder_id() TO authenticated;
GRANT ALL ON FUNCTION public.set_preorder_id() TO service_role;


--
-- Name: FUNCTION update_product_details(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.update_product_details() TO anon;
GRANT ALL ON FUNCTION public.update_product_details() TO authenticated;
GRANT ALL ON FUNCTION public.update_product_details() TO service_role;


--
-- Name: TABLE customers; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.customers TO anon;
GRANT ALL ON TABLE public.customers TO authenticated;
GRANT ALL ON TABLE public.customers TO service_role;


--
-- Name: TABLE flights; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.flights TO anon;
GRANT ALL ON TABLE public.flights TO authenticated;
GRANT ALL ON TABLE public.flights TO service_role;


--
-- Name: TABLE labels; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.labels TO anon;
GRANT ALL ON TABLE public.labels TO authenticated;
GRANT ALL ON TABLE public.labels TO service_role;


--
-- Name: TABLE payments; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.payments TO anon;
GRANT ALL ON TABLE public.payments TO authenticated;
GRANT ALL ON TABLE public.payments TO service_role;


--
-- Name: TABLE preorder_items; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.preorder_items TO anon;
GRANT ALL ON TABLE public.preorder_items TO authenticated;
GRANT ALL ON TABLE public.preorder_items TO service_role;


--
-- Name: TABLE preorders; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.preorders TO anon;
GRANT ALL ON TABLE public.preorders TO authenticated;
GRANT ALL ON TABLE public.preorders TO service_role;


--
-- Name: TABLE reminders; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.reminders TO anon;
GRANT ALL ON TABLE public.reminders TO authenticated;
GRANT ALL ON TABLE public.reminders TO service_role;


--
-- Name: TABLE transactions; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.transactions TO anon;
GRANT ALL ON TABLE public.transactions TO authenticated;
GRANT ALL ON TABLE public.transactions TO service_role;


--
-- Name: SEQUENCE transactions_transaction_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.transactions_transaction_id_seq TO anon;
GRANT ALL ON SEQUENCE public.transactions_transaction_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.transactions_transaction_id_seq TO service_role;


--
-- Name: TABLE users; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.users TO anon;
GRANT ALL ON TABLE public.users TO authenticated;
GRANT ALL ON TABLE public.users TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES  TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES  TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES  TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES  TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES  TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES  TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES  TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES  TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS  TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS  TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS  TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS  TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS  TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS  TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS  TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS  TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES  TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES  TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES  TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES  TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES  TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES  TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES  TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES  TO service_role;


--
-- PostgreSQL database dump complete
--

