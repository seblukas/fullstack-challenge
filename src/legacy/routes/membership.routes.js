const express = require("express");
const router = express.Router();
const memberships = require('../../data/memberships.json');
const membershipPeriods = require('../../data/membership-periods.json');
const { v4: uuidv4 } = require('uuid');

/**
 * create a new membership
 */
router.post("/", (req, res) => {
  const userId = 2000;

  if (!req.body.name || !req.body.recurringPrice) {
    return res.status(400).json({ message: "missingMandatoryFields" });
  }

  if (req.body.recurringPrice < 0) {
    return res.status(400).json({ message: "negativeRecurringPrice" });
  }

  if (req.body.recurringPrice > 100 && req.body.paymentMethod === 'cash') {
    return res.status(400).json({ message: "cashPriceBelow100" });
  }

  if (req.body.billingInterval === 'monthly') {
    if (req.body.billingPeriods > 12) {
      return res.status(400).json({ message: "billingPeriodsMoreThan12Months" });
    }
    if (req.billingPeriods < 6) {
      return res.status(400).json({ message: "billingPeriodsLessThan6Months" });
    }
  } else if (req.body.billingInterval === 'yearly') {
    if (req.body.billingPeriods > 3) {
      if (req.body.billingPeriods > 10) {
        return res.status(400).json({ message: "billingPeriodsMoreThan10Years" });
      } else {
        return res.status(400).json({ message: "billingPeriodsLessThan3Years" });
      }
    }
  } else {
    return res.status(400).json({ message: "invalidBillingPeriods" });
  }

  const validFrom = req.body.validFrom ? new Date(req.body.validFrom) : new Date()
  const validUntil = new Date(validFrom);
  if (req.body.billingInterval === 'monthly') {
    validUntil.setMonth(validFrom.getMonth() + req.body.billingPeriods);
  } else if (req.body.billingInterval === 'yearly') {
    validUntil.setMonth(validFrom.getMonth() + req.body.billingPeriods * 12);
  } else if (req.body.billingInterval === 'weekly') {
    validUntil.setDate(validFrom.getDate() + req.body.billingPeriods * 7);
  }

  let state = 'active'
  if (validFrom > new Date()) {
    state = 'pending'
  }
  if (validUntil < new Date()) {
    state = 'expired'
  }

  const newMembership = {
    id: memberships.length + 1,
    uuid: uuidv4(),
    name: req.body.name,
    state,
    validFrom: validFrom,
    validUntil: validUntil,
    user: userId,
    paymentMethod: req.body.paymentMethod,
    recurringPrice: req.body.recurringPrice,
    billingPeriods: req.body.billingPeriods,
    billingInterval: req.body.billingInterval,
  };
  memberships.push(newMembership);

  const membershipPeriods = []
  let periodStart = validFrom
  for (let i = 0; i < req.body.billingPeriods; i++) {
    const validFrom = periodStart
    const validUntil = new Date(validFrom)
    if (req.body.billingInterval === 'monthly') {
      validUntil.setMonth(validFrom.getMonth() + 1);
    } else if (req.body.billingInterval === 'yearly') {
      validUntil.setMonth(validFrom.getMonth() + 12);
    } else if (req.body.billingInterval === 'weekly') {
      validUntil.setDate(validFrom.getDate() + 7);
    }
    const period = {
      id: i + 1,
      uuid: uuidv4(),
      membershipId: newMembership.id,
      start: validFrom,
      end: validUntil,
      state: 'planned'
    }
    membershipPeriods.push(period)
    periodStart = validUntil
  }

  res.status(201).json({ membership: newMembership, membershipPeriods });
})

/**
 * List all memberships
 */
router.get("/", (req, res) => {
  const rows = []
  for (const membership of memberships) {
    const periods = membershipPeriods.filter(p => p.membershipId === membership.id)
    rows.push({ membership, periods })
  }
  res.status(200).json(rows);
})

module.exports = router
