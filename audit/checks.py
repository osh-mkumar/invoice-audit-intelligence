def check_calculation_errors(invoices):
    issues = []

    for invoice in invoices:
        invoice_id = invoice["invoice_id"]
        vendor_name = invoice["vendor_name"]

        for index, item in enumerate(invoice["line_items"]):
            quantity = item["quantity"]
            unit_price = item["unit_price"]
            billed_amount = item["amount"]

            expected_amount = round(quantity * unit_price, 2)
            difference = round(billed_amount - expected_amount, 2)

            if difference > 0:
                issues.append({
                    "invoice_id": invoice_id,
                    "vendor_name": vendor_name,
                    "issue_type": "calculation_error",
                    "description": item["description"],
                    "quantity": quantity,
                    "unit_price": unit_price,
                    "billed_amount": billed_amount,
                    "expected_amount": expected_amount,
                    "overcharge": difference,
                    "line_index": index
                })

    return issues


def check_rate_card_violations(invoices, rate_card):
    issues = []

    for invoice in invoices:
        invoice_id = invoice["invoice_id"]
        vendor_name = invoice["vendor_name"]

        vendor_rates = rate_card.get(vendor_name, {})

        for index, item in enumerate(invoice["line_items"]):
            description = item["description"]
            quantity = item["quantity"]
            invoice_unit_price = item["unit_price"]

            contracted_price = vendor_rates.get(description)

            if contracted_price is None:
                continue

            difference_per_unit = round(
                invoice_unit_price - contracted_price,
                2
            )

            if difference_per_unit > 0:
                overcharge = round(
                    difference_per_unit * quantity,
                    2
                )

                issues.append({
                    "invoice_id": invoice_id,
                    "vendor_name": vendor_name,
                    "issue_type": "rate_card_violation",
                    "description": description,
                    "quantity": quantity,
                    "invoice_unit_price": invoice_unit_price,
                    "contracted_price": contracted_price,
                    "overcharge": overcharge,
                    "line_index": index
                })

    return issues
    
def check_gst_mismatches(invoices, gst_reference):
    issues = []

    for invoice in invoices:
        invoice_id = invoice["invoice_id"]
        vendor_name = invoice["vendor_name"]

        for index, item in enumerate(invoice["line_items"]):
            hsn_code = item["hsn_code"]
            invoice_gst_rate = item["gst_rate"]
            amount = item["amount"]

            expected_gst_rate = gst_reference.get(hsn_code)

            if expected_gst_rate is None:
                continue

            if invoice_gst_rate != expected_gst_rate:
                gst_difference = invoice_gst_rate - expected_gst_rate

                gst_overcharge = round(
                    amount * gst_difference / 100,
                    2
                )

                # Only count an overcharge.
                if gst_overcharge > 0:
                    issues.append({
                        "invoice_id": invoice_id,
                        "vendor_name": vendor_name,
                        "issue_type": "gst_mismatch",
                        "description": item["description"],
                        "hsn_code": hsn_code,
                        "taxable_amount": amount,
                        "invoice_gst_rate": invoice_gst_rate,
                        "expected_gst_rate": expected_gst_rate,
                        "gst_overcharge": gst_overcharge,
                        "overcharge": gst_overcharge,
                        "line_index": index
                    })

    return issues


def check_mystery_surcharges(invoices, rate_card):
    issues = []

    for invoice in invoices:
        invoice_id = invoice["invoice_id"]
        vendor_name = invoice["vendor_name"]

        vendor_rates = rate_card.get(vendor_name, {})

        for index, item in enumerate(invoice["line_items"]):
            description = item["description"]
            quantity = item["quantity"]
            unit_price = item["unit_price"]
            amount = item["amount"]
            hsn_code = item.get("hsn_code")

            if description not in vendor_rates:
                issues.append({
                    "invoice_id": invoice_id,
                    "vendor_name": vendor_name,
                    "issue_type": "mystery_surcharge",
                    "description": description,
                    "quantity": quantity,
                    "unit_price": unit_price,
                    "amount": amount,
                    "hsn_code": hsn_code,
                    "overcharge": amount,
                    "line_index": index
                })

    return issues


def check_subtotal_mismatches(invoices):
    issues = []

    for invoice in invoices:
        invoice_id = invoice["invoice_id"]
        vendor_name = invoice["vendor_name"]
        stated_subtotal = invoice["subtotal"]

        calculated_subtotal = round(
            sum(item["amount"] for item in invoice["line_items"]),
            2
        )

        difference = round(stated_subtotal - calculated_subtotal, 2)

        if difference > 0:
            issues.append({
                "invoice_id": invoice_id,
                "vendor_name": vendor_name,
                "issue_type": "subtotal_mismatch",
                "stated_subtotal": stated_subtotal,
                "calculated_subtotal": calculated_subtotal,
                "overcharge": difference
            })

    return issues


def check_duplicate_invoices(invoices):
    issues = []
    seen_fingerprints = {}

    for invoice in invoices:
        invoice_id = invoice["invoice_id"]
        vendor_name = invoice["vendor_name"]

        line_items_tuple = tuple(
            (
                item["description"],
                item["quantity"],
                item["unit_price"],
                item["amount"]
            )
            for item in invoice["line_items"]
        )

        fingerprint = (
            vendor_name,
            line_items_tuple,
            invoice["subtotal"],
            invoice["gst_amount"],
            invoice["total"]
        )

        if fingerprint in seen_fingerprints:
            original_invoice_id = seen_fingerprints[fingerprint]
            issues.append({
                "invoice_id": invoice_id,
                "vendor_name": vendor_name,
                "issue_type": "duplicate_invoice",
                "duplicate_of": original_invoice_id,
                "amount": invoice["total"],
                "overcharge": invoice["total"]
            })
        else:
            seen_fingerprints[fingerprint] = invoice_id

    return issues

