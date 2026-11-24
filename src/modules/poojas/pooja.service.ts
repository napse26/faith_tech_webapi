import { prisma } from '../../config/database';
import { BadRequestError, NotFoundError, ForbiddenError } from '../../common/errors/app-error';
import {
  GenerateQuoteDto,
  CreateBookingDto,
  RescheduleBookingDto,
  CancelBookingDto,
  SimulatePaymentDto,
  BookingFeedbackDto,
  CreatePoojaDto,
  UpdatePoojaDto,
  CreatePoojaPackageDto,
  UpdatePoojaPackageDto,
  CreatePoojaAddonDto,
  UpdatePoojaAddonDto,
  BulkCreateSlotsDto,
  AdminAssignPriestDto,
  AdminUpdateBookingStatusDto,
  AdminSetLiveSessionDto,
  AdminProcessRefundDto,
  PoojaFilterQuery,
  BookingFilterQuery
} from './pooja.types';

export class PoojaService {
  // =========================================================================
  // 1. PUBLIC POOJA CATALOG
  // =========================================================================

  async getCategories() {
    return prisma.pooja_categories.findMany({
      where: { is_active: true },
      orderBy: { sort_order: 'asc' }
    });
  }

  async listPoojas(query: PoojaFilterQuery) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(50, Math.max(1, query.limit || 10));
    const skip = (page - 1) * limit;

    const where: any = {
      status: 'PUBLISHED'
    };

    if (query.categoryId) {
      where.category_id = query.categoryId;
    }

    if (query.isFeatured !== undefined) {
      where.is_featured = query.isFeatured;
    }

    if (query.language) {
      where.supported_languages = {
        has: query.language
      };
    }

    if (query.deliveryMode) {
      where.delivery_modes = {
        has: query.deliveryMode
      };
    }

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { short_description: { contains: query.search, mode: 'insensitive' } },
        { temple_name: { contains: query.search, mode: 'insensitive' } }
      ];
    }

    const [total, poojas] = await Promise.all([
      prisma.poojas.count({ where }),
      prisma.poojas.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ is_featured: 'desc' }, { created_at: 'desc' }],
        include: {
          pooja_categories: true,
          pooja_packages: {
            where: { is_active: true },
            orderBy: { price: 'asc' }
          }
        }
      })
    ]);

    return {
      poojas: poojas.map(p => {
        const startingPrice = p.pooja_packages.length > 0
          ? Math.min(...p.pooja_packages.map(pkg => Number(pkg.discount_price ?? pkg.price)))
          : 0;

        return {
          poojaId: p.pooja_id,
          title: p.title,
          slug: p.slug,
          category: p.pooja_categories.name,
          shortDescription: p.short_description,
          significance: p.significance,
          templeName: p.temple_name,
          templeLocation: p.temple_location,
          imageUrl: p.image_url,
          bannerUrl: p.banner_url,
          durationMinutes: p.duration_minutes,
          supportedLanguages: p.supported_languages,
          deliveryModes: p.delivery_modes,
          isFeatured: p.is_featured,
          startingPrice,
          packagesCount: p.pooja_packages.length
        };
      }),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async getPoojaDetails(idOrSlug: string) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);

    const pooja = await prisma.poojas.findFirst({
      where: isUuid
        ? { pooja_id: idOrSlug, status: 'PUBLISHED' }
        : { slug: idOrSlug, status: 'PUBLISHED' },
      include: {
        pooja_categories: true,
        pooja_packages: {
          where: { is_active: true },
          orderBy: { price: 'asc' }
        },
        pooja_addons: {
          where: { is_active: true },
          orderBy: { price: 'asc' }
        }
      }
    });

    if (!pooja) {
      throw new NotFoundError('Pooja not found or not published', 'POOJA_NOT_FOUND');
    }

    return pooja;
  }

  async getPoojaPackages(poojaId: string) {
    return prisma.pooja_packages.findMany({
      where: { pooja_id: poojaId, is_active: true },
      orderBy: { price: 'asc' }
    });
  }

  async getPoojaAddons(poojaId: string) {
    return prisma.pooja_addons.findMany({
      where: { pooja_id: poojaId, is_active: true },
      orderBy: { price: 'asc' }
    });
  }

  async getPoojaAvailability(poojaId: string, startDate?: string, endDate?: string) {
    const fromDate = startDate ? new Date(startDate) : new Date();
    const toDate = endDate ? new Date(endDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const slots = await prisma.pooja_slots.findMany({
      where: {
        pooja_id: poojaId,
        is_active: true,
        slot_date: {
          gte: fromDate,
          lte: toDate
        },
        status: { not: 'FULL' }
      },
      select: {
        slot_date: true
      },
      distinct: ['slot_date'],
      orderBy: { slot_date: 'asc' }
    });

    return {
      poojaId,
      availableDates: slots.map(s => s.slot_date.toISOString().split('T')[0])
    };
  }

  async getPoojaSlots(poojaId: string, dateStr: string) {
    const slotDate = new Date(dateStr);

    const slots = await prisma.pooja_slots.findMany({
      where: {
        pooja_id: poojaId,
        slot_date: slotDate,
        is_active: true
      },
      orderBy: { start_time: 'asc' }
    });

    return slots.map(s => {
      const maxCap = s.max_capacity ?? 5;
      const booked = s.booked_count ?? 0;
      const availableCap = Math.max(0, maxCap - booked);

      return {
        slotId: s.slot_id,
        slotDate: s.slot_date.toISOString().split('T')[0],
        startTime: s.start_time,
        endTime: s.end_time,
        timezone: s.timezone,
        maxCapacity: maxCap,
        bookedCount: booked,
        availableCapacity: availableCap,
        status: availableCap > 0 ? 'AVAILABLE' : 'FULL'
      };
    });
  }

  async getPoojaRequirements(poojaId: string) {
    const pooja = await prisma.poojas.findUnique({
      where: { pooja_id: poojaId }
    });

    if (!pooja) {
      throw new NotFoundError('Pooja not found', 'POOJA_NOT_FOUND');
    }

    return {
      poojaId: pooja.pooja_id,
      title: pooja.title,
      durationMinutes: pooja.duration_minutes,
      deliveryModes: pooja.delivery_modes,
      supportedLanguages: pooja.supported_languages,
      samagriInfo: pooja.samagri_info,
      instructions: pooja.instructions,
      ritualSteps: pooja.ritual_steps,
      cancellationPolicy: pooja.cancellation_policy,
      leadTimeHours: pooja.lead_time_hours,
      sankalpFields: [
        { field: 'sankalpPurpose', required: true, description: 'Purpose or reason for the pooja' },
        { field: 'kuldeviDevta', required: false, description: 'Family Deity / Ishta Devta' },
        { field: 'familyGotra', required: false, description: 'Gotra of devotee family' },
        { field: 'wishes', required: false, description: 'Specific prayer or wish for the sankalp' },
        { field: 'specialInstructions', required: false, description: 'Any dietary/ritual requirements' }
      ],
      devoteeFields: [
        { field: 'name', required: true },
        { field: 'relationship', required: false },
        { field: 'gender', required: false },
        { field: 'gotra', required: false },
        { field: 'rashi', required: false },
        { field: 'nakshatra', required: false },
        { field: 'dateOfBirth', required: false }
      ]
    };
  }

  // =========================================================================
  // 2. QUOTE ENGINE (15-Minute Slot Lock)
  // =========================================================================

  async generateQuote(userId: bigint, dto: GenerateQuoteDto) {
    const pooja = await prisma.poojas.findFirst({
      where: { pooja_id: dto.poojaId, status: 'PUBLISHED' }
    });

    if (!pooja) {
      throw new NotFoundError('Pooja not found or not published', 'POOJA_NOT_FOUND');
    }

    const pkg = await prisma.pooja_packages.findFirst({
      where: {
        package_id: dto.packageId,
        pooja_id: dto.poojaId,
        is_active: true
      }
    });

    if (!pkg) {
      throw new NotFoundError('Selected pooja package not found or inactive', 'PACKAGE_NOT_FOUND');
    }

    // Verify slot
    const slot = await prisma.pooja_slots.findFirst({
      where: {
        slot_id: dto.slotId,
        pooja_id: dto.poojaId,
        is_active: true
      }
    });

    if (!slot) {
      throw new NotFoundError('Selected pooja slot not found or inactive', 'SLOT_NOT_FOUND');
    }

    const maxCap = slot.max_capacity ?? 5;
    const booked = slot.booked_count ?? 0;
    if (booked >= maxCap || slot.status === 'FULL') {
      throw new BadRequestError('Selected time slot is already fully booked', 'SLOT_FULL');
    }

    // Devotee count check
    if (dto.devotees.length > (pkg.max_devotees ?? 4)) {
      throw new BadRequestError(
        `Selected package allows maximum ${pkg.max_devotees} devotees. You provided ${dto.devotees.length}.`,
        'DEVOTEE_LIMIT_EXCEEDED'
      );
    }

    // Calculate prices
    const basePrice = Number(pkg.discount_price ?? pkg.price);
    let addonsTotal = 0;
    const resolvedAddons: Array<{ addonId: string; title: string; price: number; quantity: number }> = [];

    if (dto.addons && dto.addons.length > 0) {
      const addonIds = dto.addons.map(a => a.addonId);
      const dbAddons = await prisma.pooja_addons.findMany({
        where: {
          addon_id: { in: addonIds },
          pooja_id: dto.poojaId,
          is_active: true
        }
      });

      for (const sel of dto.addons) {
        const found = dbAddons.find(a => a.addon_id === sel.addonId);
        if (found) {
          const itemPrice = Number(found.price);
          const lineTotal = itemPrice * sel.quantity;
          addonsTotal += lineTotal;
          resolvedAddons.push({
            addonId: found.addon_id,
            title: found.title,
            price: itemPrice,
            quantity: sel.quantity
          });
        }
      }
    }

    const totalPrice = basePrice + addonsTotal;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15-minute lock

    const quote = await prisma.pooja_quotes.create({
      data: {
        user_id: userId,
        pooja_id: dto.poojaId,
        package_id: dto.packageId,
        slot_id: dto.slotId,
        delivery_mode: dto.deliveryMode,
        addons_json: resolvedAddons as any,
        devotees_json: dto.devotees as any,
        sankalp_details_json: (dto.sankalpDetails ?? {}) as any,
        base_price: basePrice,
        addons_total: addonsTotal,
        total_price: totalPrice,
        currency: pkg.currency ?? 'INR',
        expires_at: expiresAt
      }
    });

    return {
      quoteId: quote.quote_id,
      pooja: {
        poojaId: pooja.pooja_id,
        title: pooja.title,
        deliveryMode: dto.deliveryMode
      },
      package: {
        packageId: pkg.package_id,
        title: pkg.title,
        price: basePrice,
        samagriIncluded: pkg.samagri_included
      },
      slot: {
        slotId: slot.slot_id,
        slotDate: slot.slot_date.toISOString().split('T')[0],
        startTime: slot.start_time,
        endTime: slot.end_time
      },
      devotees: dto.devotees,
      sankalpDetails: dto.sankalpDetails,
      addons: resolvedAddons,
      priceBreakdown: {
        basePrice,
        addonsTotal,
        totalPrice,
        currency: pkg.currency ?? 'INR'
      },
      expiresAt: quote.expires_at,
      expiresInSeconds: 900
    };
  }

  async getQuote(userId: bigint, quoteId: string) {
    const quote = await prisma.pooja_quotes.findUnique({
      where: { quote_id: quoteId },
      include: {
        poojas: true,
        pooja_packages: true,
        pooja_slots: true
      }
    });

    if (!quote) {
      throw new NotFoundError('Quote not found', 'QUOTE_NOT_FOUND');
    }

    if (quote.user_id !== userId) {
      throw new ForbiddenError('You do not have permission to view this quote', 'FORBIDDEN');
    }

    const isExpired = new Date() > quote.expires_at;
    const remainingSeconds = Math.max(0, Math.floor((quote.expires_at.getTime() - Date.now()) / 1000));

    return {
      quoteId: quote.quote_id,
      isExpired,
      isConsumed: quote.is_consumed,
      remainingSeconds,
      pooja: {
        poojaId: quote.poojas.pooja_id,
        title: quote.poojas.title,
        deliveryMode: quote.delivery_mode
      },
      package: {
        packageId: quote.pooja_packages.package_id,
        title: quote.pooja_packages.title,
        price: Number(quote.base_price)
      },
      slot: {
        slotId: quote.pooja_slots.slot_id,
        slotDate: quote.pooja_slots.slot_date.toISOString().split('T')[0],
        startTime: quote.pooja_slots.start_time,
        endTime: quote.pooja_slots.end_time
      },
      devotees: quote.devotees_json,
      sankalpDetails: quote.sankalp_details_json,
      addons: quote.addons_json,
      priceBreakdown: {
        basePrice: Number(quote.base_price),
        addonsTotal: Number(quote.addons_total),
        totalPrice: Number(quote.total_price),
        currency: quote.currency
      },
      expiresAt: quote.expires_at
    };
  }

  // =========================================================================
  // 3. CUSTOMER BOOKING LIFECYCLE
  // =========================================================================

  async createBooking(userId: bigint, dto: CreateBookingDto) {
    const quote = await prisma.pooja_quotes.findUnique({
      where: { quote_id: dto.quoteId },
      include: {
        poojas: true,
        pooja_packages: true,
        pooja_slots: true
      }
    });

    if (!quote) {
      throw new NotFoundError('Quote not found', 'QUOTE_NOT_FOUND');
    }

    if (quote.user_id !== userId) {
      throw new ForbiddenError('You do not have access to this quote', 'FORBIDDEN');
    }

    if (quote.is_consumed) {
      throw new BadRequestError('This quote has already been converted to a booking', 'QUOTE_ALREADY_CONSUMED');
    }

    if (new Date() > quote.expires_at) {
      throw new BadRequestError('Quote has expired. Please generate a new quote.', 'QUOTE_EXPIRED');
    }

    // Atomic transaction for slot booking
    const booking = await prisma.$transaction(async (tx) => {
      // Re-verify slot capacity with lock
      const slot = await tx.pooja_slots.findUnique({
        where: { slot_id: quote.slot_id }
      });

      if (!slot) {
        throw new NotFoundError('Slot not found', 'SLOT_NOT_FOUND');
      }

      const maxCap = slot.max_capacity ?? 5;
      const booked = slot.booked_count ?? 0;

      if (booked >= maxCap || slot.status === 'FULL') {
        throw new BadRequestError('Slot became fully booked while processing', 'SLOT_FULL');
      }

      // Increment booked_count
      const newBookedCount = booked + 1;
      const newStatus = newBookedCount >= maxCap ? 'FULL' : 'AVAILABLE';

      await tx.pooja_slots.update({
        where: { slot_id: slot.slot_id },
        data: {
          booked_count: newBookedCount,
          status: newStatus
        }
      });

      // Mark quote consumed
      await tx.pooja_quotes.update({
        where: { quote_id: quote.quote_id },
        data: { is_consumed: true }
      });

      // Generate unique human-readable booking number
      const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const randPart = Math.floor(10000 + Math.random() * 90000);
      const bookingNumber = `PJ-${datePart}-${randPart}`;

      const priceSnapshot = {
        basePrice: Number(quote.base_price),
        addonsTotal: Number(quote.addons_total),
        totalPrice: Number(quote.total_price),
        currency: quote.currency,
        addons: quote.addons_json
      };

      const packageSnapshot = {
        packageId: quote.package_id,
        title: quote.pooja_packages.title,
        durationMinutes: quote.pooja_packages.duration_minutes,
        samagriIncluded: quote.pooja_packages.samagri_included,
        priestLevel: quote.pooja_packages.priest_level
      };

      const createdBooking = await tx.pooja_bookings.create({
        data: {
          booking_number: bookingNumber,
          user_id: userId,
          pooja_id: quote.pooja_id,
          package_id: quote.package_id,
          slot_id: quote.slot_id,
          delivery_mode: quote.delivery_mode,
          status: 'PENDING_PAYMENT',
          price_snapshot: priceSnapshot as any,
          package_snapshot: packageSnapshot as any,
          devotees: quote.devotees_json as any,
          sankalp_details: quote.sankalp_details_json as any,
          customer_address: dto.customerAddress
        }
      });

      // Audit trail
      await tx.pooja_booking_audit.create({
        data: {
          booking_id: createdBooking.booking_id,
          from_status: null,
          to_status: 'PENDING_PAYMENT',
          actor_id: userId,
          actor_role: 'CUSTOMER',
          reason: 'Booking initiated from quote'
        }
      });

      return createdBooking;
    });

    return this.getBookingDetails(userId, booking.booking_id);
  }

  async listCustomerBookings(userId: bigint, query: BookingFilterQuery) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(50, Math.max(1, query.limit || 10));
    const skip = (page - 1) * limit;

    const where: any = {
      user_id: userId
    };

    if (query.status) {
      where.status = query.status;
    }

    const [total, bookings] = await Promise.all([
      prisma.pooja_bookings.count({ where }),
      prisma.pooja_bookings.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          poojas: {
            select: {
              pooja_id: true,
              title: true,
              image_url: true,
              temple_name: true,
              temple_location: true
            }
          },
          pooja_slots: true,
          priests: {
            select: {
              priest_id: true,
              name: true,
              qualification: true
            }
          }
        }
      })
    ]);

    return {
      bookings: bookings.map(b => ({
        bookingId: b.booking_id,
        bookingNumber: b.booking_number,
        pooja: b.poojas,
        status: b.status,
        deliveryMode: b.delivery_mode,
        slotDate: b.pooja_slots.slot_date.toISOString().split('T')[0],
        startTime: b.pooja_slots.start_time,
        endTime: b.pooja_slots.end_time,
        priest: b.priests,
        priceSnapshot: b.price_snapshot,
        createdAt: b.created_at
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async getBookingDetails(userId: bigint, bookingId: string, isAdmin = false) {
    const booking = await prisma.pooja_bookings.findUnique({
      where: { booking_id: bookingId },
      include: {
        poojas: true,
        pooja_packages: true,
        pooja_slots: true,
        priests: true
      }
    });

    if (!booking) {
      throw new NotFoundError('Booking not found', 'BOOKING_NOT_FOUND');
    }

    if (!isAdmin && booking.user_id !== userId) {
      throw new ForbiddenError('You do not have permission to view this booking', 'FORBIDDEN');
    }

    return {
      bookingId: booking.booking_id,
      bookingNumber: booking.booking_number,
      status: booking.status,
      deliveryMode: booking.delivery_mode,
      pooja: {
        poojaId: booking.poojas.pooja_id,
        title: booking.poojas.title,
        templeName: booking.poojas.temple_name,
        templeLocation: booking.poojas.temple_location,
        imageUrl: booking.poojas.image_url,
        durationMinutes: booking.poojas.duration_minutes,
        cancellationPolicy: booking.poojas.cancellation_policy
      },
      package: booking.package_snapshot,
      slot: {
        slotId: booking.pooja_slots.slot_id,
        slotDate: booking.pooja_slots.slot_date.toISOString().split('T')[0],
        startTime: booking.pooja_slots.start_time,
        endTime: booking.pooja_slots.end_time,
        timezone: booking.pooja_slots.timezone
      },
      priest: booking.priests
        ? {
            priestId: booking.priests.priest_id,
            name: booking.priests.name,
            qualification: booking.priests.qualification,
            templeAffiliation: booking.priests.temple_affiliation,
            phone: booking.priests.phone
          }
        : null,
      devotees: booking.devotees,
      sankalpDetails: booking.sankalp_details,
      customerAddress: booking.customer_address,
      liveStreamUrl: booking.live_stream_url,
      liveStreamNotes: booking.live_stream_notes,
      priceSnapshot: booking.price_snapshot,
      cancellation: {
        cancellationReason: booking.cancellation_reason,
        cancellationFee: Number(booking.cancellation_fee),
        refundAmount: Number(booking.refund_amount),
        refundStatus: booking.refund_status
      },
      feedback: {
        rating: booking.feedback_rating,
        comment: booking.feedback_comment
      },
      createdAt: booking.created_at,
      updatedAt: booking.updated_at
    };
  }

  async initiatePayment(userId: bigint, bookingId: string, dto: SimulatePaymentDto) {
    const booking = await prisma.pooja_bookings.findUnique({
      where: { booking_id: bookingId }
    });

    if (!booking) {
      throw new NotFoundError('Booking not found', 'BOOKING_NOT_FOUND');
    }

    if (booking.user_id !== userId) {
      throw new ForbiddenError('Unauthorized access to booking', 'FORBIDDEN');
    }

    if (booking.status !== 'PENDING_PAYMENT') {
      throw new BadRequestError(
        `Cannot process payment for booking in status ${booking.status}`,
        'INVALID_BOOKING_STATUS'
      );
    }

    const txId = dto.transactionId ?? `TXN-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    await prisma.$transaction(async (tx) => {
      await tx.pooja_bookings.update({
        where: { booking_id: bookingId },
        data: {
          status: 'CONFIRMED',
          updated_at: new Date()
        }
      });

      await tx.pooja_booking_audit.create({
        data: {
          booking_id: bookingId,
          from_status: 'PENDING_PAYMENT',
          to_status: 'CONFIRMED',
          actor_id: userId,
          actor_role: 'CUSTOMER',
          reason: `Payment confirmed via ${dto.paymentMethod ?? 'UPI'} (Ref: ${txId})`,
          metadata: { transactionId: txId, paymentMethod: dto.paymentMethod ?? 'UPI' }
        }
      });
    });

    return {
      bookingId,
      bookingNumber: booking.booking_number,
      status: 'CONFIRMED',
      transactionId: txId,
      message: 'Payment received successfully. Your pooja is confirmed!'
    };
  }

  async cancelBooking(userId: bigint, bookingId: string, dto: CancelBookingDto) {
    const booking = await prisma.pooja_bookings.findUnique({
      where: { booking_id: bookingId },
      include: {
        poojas: true,
        pooja_slots: true
      }
    });

    if (!booking) {
      throw new NotFoundError('Booking not found', 'BOOKING_NOT_FOUND');
    }

    if (booking.user_id !== userId) {
      throw new ForbiddenError('Unauthorized access to booking', 'FORBIDDEN');
    }

    if (booking.status === 'CANCELLED' || booking.status === 'COMPLETED' || booking.status === 'REFUNDED') {
      throw new BadRequestError(`Cannot cancel booking in status ${booking.status}`, 'CANNOT_CANCEL');
    }

    // Determine cutoff hours
    const cutoffHours = booking.poojas.cancellation_cutoff_hours ?? 24;
    const slotDateTime = new Date(`${booking.pooja_slots.slot_date.toISOString().split('T')[0]}T${booking.pooja_slots.start_time}`);
    const hoursUntilSlot = (slotDateTime.getTime() - Date.now()) / (1000 * 60 * 60);

    const priceObj = booking.price_snapshot as any;
    const totalPrice = Number(priceObj?.totalPrice ?? 0);

    let cancellationFee = 0;
    let refundAmount = totalPrice;

    // If within cutoff, apply partial cancellation penalty
    if (hoursUntilSlot < cutoffHours) {
      cancellationFee = totalPrice * 0.25; // 25% late fee
      refundAmount = totalPrice - cancellationFee;
    }

    await prisma.$transaction(async (tx) => {
      // Reopen capacity on the slot
      const currentSlot = await tx.pooja_slots.findUnique({
        where: { slot_id: booking.slot_id }
      });

      if (currentSlot) {
        const newBookedCount = Math.max(0, (currentSlot.booked_count ?? 1) - 1);
        await tx.pooja_slots.update({
          where: { slot_id: booking.slot_id },
          data: {
            booked_count: newBookedCount,
            status: 'AVAILABLE'
          }
        });
      }

      await tx.pooja_bookings.update({
        where: { booking_id: bookingId },
        data: {
          status: 'CANCELLED',
          cancellation_reason: dto.reason,
          cancellation_fee: cancellationFee,
          refund_amount: refundAmount,
          refund_status: refundAmount > 0 ? 'PENDING' : 'NONE',
          updated_at: new Date()
        }
      });

      await tx.pooja_booking_audit.create({
        data: {
          booking_id: bookingId,
          from_status: booking.status,
          to_status: 'CANCELLED',
          actor_id: userId,
          actor_role: 'CUSTOMER',
          reason: dto.reason,
          metadata: { cancellationFee, refundAmount, hoursUntilSlot }
        }
      });
    });

    return {
      bookingId,
      status: 'CANCELLED',
      cancellationFee,
      refundAmount,
      refundStatus: refundAmount > 0 ? 'PENDING' : 'NONE',
      message: 'Booking cancelled successfully'
    };
  }

  async rescheduleBooking(userId: bigint, bookingId: string, dto: RescheduleBookingDto) {
    const booking = await prisma.pooja_bookings.findUnique({
      where: { booking_id: bookingId },
      include: {
        poojas: true,
        pooja_slots: true
      }
    });

    if (!booking) {
      throw new NotFoundError('Booking not found', 'BOOKING_NOT_FOUND');
    }

    if (booking.user_id !== userId) {
      throw new ForbiddenError('Unauthorized access to booking', 'FORBIDDEN');
    }

    if (booking.status !== 'CONFIRMED') {
      throw new BadRequestError(`Cannot reschedule booking in status ${booking.status}`, 'CANNOT_RESCHEDULE');
    }

    // Check reschedule cutoff
    const cutoffHours = booking.poojas.reschedule_cutoff_hours ?? 12;
    const currentSlotDateTime = new Date(`${booking.pooja_slots.slot_date.toISOString().split('T')[0]}T${booking.pooja_slots.start_time}`);
    const hoursUntilSlot = (currentSlotDateTime.getTime() - Date.now()) / (1000 * 60 * 60);

    if (hoursUntilSlot < cutoffHours) {
      throw new BadRequestError(
        `Rescheduling is not allowed within ${cutoffHours} hours of the scheduled pooja`,
        'RESCHEDULE_WINDOW_EXPIRED'
      );
    }

    // Validate new slot
    const newSlot = await prisma.pooja_slots.findFirst({
      where: {
        slot_id: dto.newSlotId,
        pooja_id: booking.pooja_id,
        is_active: true
      }
    });

    if (!newSlot) {
      throw new NotFoundError('New slot not found or inactive', 'SLOT_NOT_FOUND');
    }

    const maxCap = newSlot.max_capacity ?? 5;
    const booked = newSlot.booked_count ?? 0;
    if (booked >= maxCap || newSlot.status === 'FULL') {
      throw new BadRequestError('Target slot is already fully booked', 'TARGET_SLOT_FULL');
    }

    await prisma.$transaction(async (tx) => {
      // 1. Release capacity on old slot
      const oldSlot = await tx.pooja_slots.findUnique({
        where: { slot_id: booking.slot_id }
      });
      if (oldSlot) {
        await tx.pooja_slots.update({
          where: { slot_id: booking.slot_id },
          data: {
            booked_count: Math.max(0, (oldSlot.booked_count ?? 1) - 1),
            status: 'AVAILABLE'
          }
        });
      }

      // 2. Reserve capacity on new slot
      const newBookedCount = booked + 1;
      await tx.pooja_slots.update({
        where: { slot_id: dto.newSlotId },
        data: {
          booked_count: newBookedCount,
          status: newBookedCount >= maxCap ? 'FULL' : 'AVAILABLE'
        }
      });

      // 3. Update booking
      await tx.pooja_bookings.update({
        where: { booking_id: bookingId },
        data: {
          slot_id: dto.newSlotId,
          updated_at: new Date()
        }
      });

      // 4. Audit
      await tx.pooja_booking_audit.create({
        data: {
          booking_id: bookingId,
          from_status: booking.status,
          to_status: 'CONFIRMED',
          actor_id: userId,
          actor_role: 'CUSTOMER',
          reason: `Rescheduled from ${booking.pooja_slots.slot_date.toISOString().split('T')[0]} ${booking.pooja_slots.start_time} to ${newSlot.slot_date.toISOString().split('T')[0]} ${newSlot.start_time}. Reason: ${dto.reason ?? 'Devotee request'}`
        }
      });
    });

    return this.getBookingDetails(userId, bookingId);
  }

  async getReceipt(userId: bigint, bookingId: string) {
    const booking = await prisma.pooja_bookings.findUnique({
      where: { booking_id: bookingId },
      include: {
        poojas: true,
        pooja_slots: true,
        users: {
          select: {
            full_name: true,
            mobile_no: true,
            email: true
          }
        }
      }
    });

    if (!booking) {
      throw new NotFoundError('Booking not found', 'BOOKING_NOT_FOUND');
    }

    if (booking.user_id !== userId) {
      throw new ForbiddenError('Unauthorized access to booking receipt', 'FORBIDDEN');
    }

    const price = booking.price_snapshot as any;

    return {
      receiptNumber: `REC-${booking.booking_number}`,
      bookingNumber: booking.booking_number,
      issueDate: booking.created_at,
      status: booking.status,
      customer: {
        name: booking.users.full_name,
        mobile: booking.users.mobile_no,
        email: booking.users.email
      },
      pooja: {
        title: booking.poojas.title,
        deliveryMode: booking.delivery_mode,
        templeName: booking.poojas.temple_name
      },
      slot: {
        date: booking.pooja_slots.slot_date.toISOString().split('T')[0],
        time: `${booking.pooja_slots.start_time} - ${booking.pooja_slots.end_time}`
      },
      devotees: booking.devotees,
      sankalp: booking.sankalp_details,
      itemizedCharges: {
        basePrice: price?.basePrice ?? 0,
        addons: price?.addons ?? [],
        addonsTotal: price?.addonsTotal ?? 0,
        totalAmount: price?.totalPrice ?? 0,
        currency: price?.currency ?? 'INR'
      }
    };
  }

  async getLiveSession(userId: bigint, bookingId: string) {
    const booking = await prisma.pooja_bookings.findUnique({
      where: { booking_id: bookingId },
      include: {
        poojas: true,
        pooja_slots: true,
        priests: true
      }
    });

    if (!booking) {
      throw new NotFoundError('Booking not found', 'BOOKING_NOT_FOUND');
    }

    if (booking.user_id !== userId) {
      throw new ForbiddenError('Unauthorized', 'FORBIDDEN');
    }

    if (booking.delivery_mode !== 'ONLINE') {
      throw new BadRequestError('This pooja booking is not configured for an online live session', 'NOT_ONLINE_POOJA');
    }

    return {
      bookingId: booking.booking_id,
      bookingNumber: booking.booking_number,
      status: booking.status,
      scheduledTime: {
        date: booking.pooja_slots.slot_date.toISOString().split('T')[0],
        startTime: booking.pooja_slots.start_time,
        endTime: booking.pooja_slots.end_time,
        timezone: booking.pooja_slots.timezone
      },
      priest: booking.priests
        ? {
            name: booking.priests.name,
            qualification: booking.priests.qualification
          }
        : null,
      liveStreamUrl: booking.live_stream_url,
      liveStreamNotes: booking.live_stream_notes ?? 'Join 5 minutes before scheduled start time with fresh puja samagri.',
      instructions: booking.poojas.instructions,
      samagriInfo: booking.poojas.samagri_info
    };
  }

  async submitFeedback(userId: bigint, bookingId: string, dto: BookingFeedbackDto) {
    const booking = await prisma.pooja_bookings.findUnique({
      where: { booking_id: bookingId }
    });

    if (!booking) {
      throw new NotFoundError('Booking not found', 'BOOKING_NOT_FOUND');
    }

    if (booking.user_id !== userId) {
      throw new ForbiddenError('Unauthorized', 'FORBIDDEN');
    }

    if (booking.status !== 'COMPLETED') {
      throw new BadRequestError('Feedback can only be submitted for completed poojas', 'POOJA_NOT_COMPLETED');
    }

    const updated = await prisma.pooja_bookings.update({
      where: { booking_id: bookingId },
      data: {
        feedback_rating: dto.rating,
        feedback_comment: dto.comment,
        updated_at: new Date()
      }
    });

    return {
      bookingId: updated.booking_id,
      rating: updated.feedback_rating,
      comment: updated.feedback_comment,
      message: 'Devotee feedback submitted successfully'
    };
  }

  // =========================================================================
  // 4. PRIESTS
  // =========================================================================

  async listPriests() {
    return prisma.priests.findMany({
      orderBy: { rating: 'desc' }
    });
  }

  async getPriestDetails(priestId: string) {
    const priest = await prisma.priests.findUnique({
      where: { priest_id: priestId }
    });

    if (!priest) {
      throw new NotFoundError('Priest not found', 'PRIEST_NOT_FOUND');
    }

    return priest;
  }

  // =========================================================================
  // 5. ADMIN POOJA & BOOKING MANAGEMENT
  // =========================================================================

  async adminListPoojas(query: PoojaFilterQuery) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(50, Math.max(1, query.limit || 10));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.categoryId) where.category_id = query.categoryId;
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { slug: { contains: query.search, mode: 'insensitive' } }
      ];
    }

    const [total, list] = await Promise.all([
      prisma.poojas.count({ where }),
      prisma.poojas.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          pooja_categories: true,
          pooja_packages: true,
          pooja_addons: true
        }
      })
    ]);

    return {
      poojas: list,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) }
    };
  }

  async adminCreatePooja(dto: CreatePoojaDto) {
    const existing = await prisma.poojas.findUnique({
      where: { slug: dto.slug }
    });

    if (existing) {
      throw new BadRequestError('Pooja slug already in use', 'SLUG_EXISTS');
    }

    const created = await prisma.poojas.create({
      data: {
        category_id: dto.categoryId,
        title: dto.title,
        slug: dto.slug,
        short_description: dto.shortDescription,
        description: dto.description,
        significance: dto.significance,
        benefits: dto.benefits ?? [],
        ritual_steps: dto.ritualSteps ?? [],
        samagri_info: dto.samagriInfo,
        instructions: dto.instructions,
        supported_languages: dto.supportedLanguages ?? ['Hindi', 'Sanskrit', 'English'],
        delivery_modes: dto.deliveryModes ?? ['ONLINE', 'TEMPLE'],
        temple_name: dto.templeName,
        temple_location: dto.templeLocation,
        image_url: dto.imageUrl,
        banner_url: dto.bannerUrl,
        duration_minutes: dto.durationMinutes ?? 60,
        lead_time_hours: dto.leadTimeHours ?? 24,
        cancellation_policy: dto.cancellationPolicy,
        cancellation_cutoff_hours: dto.cancellationCutoffHours ?? 24,
        reschedule_cutoff_hours: dto.rescheduleCutoffHours ?? 12,
        status: dto.status ?? 'DRAFT',
        is_featured: dto.isFeatured ?? false
      }
    });

    return created;
  }

  async adminUpdatePooja(poojaId: string, dto: UpdatePoojaDto) {
    const existing = await prisma.poojas.findUnique({
      where: { pooja_id: poojaId }
    });

    if (!existing) {
      throw new NotFoundError('Pooja not found', 'POOJA_NOT_FOUND');
    }

    const updated = await prisma.poojas.update({
      where: { pooja_id: poojaId },
      data: {
        category_id: dto.categoryId ?? existing.category_id,
        title: dto.title ?? existing.title,
        slug: dto.slug ?? existing.slug,
        short_description: dto.shortDescription ?? existing.short_description,
        description: dto.description ?? existing.description,
        significance: dto.significance ?? existing.significance,
        benefits: dto.benefits ?? existing.benefits,
        ritual_steps: dto.ritualSteps ?? existing.ritual_steps,
        samagri_info: dto.samagriInfo ?? existing.samagri_info,
        instructions: dto.instructions ?? existing.instructions,
        supported_languages: dto.supportedLanguages ?? existing.supported_languages,
        delivery_modes: dto.deliveryModes ?? existing.delivery_modes,
        temple_name: dto.templeName ?? existing.temple_name,
        temple_location: dto.templeLocation ?? existing.temple_location,
        image_url: dto.imageUrl ?? existing.image_url,
        banner_url: dto.bannerUrl ?? existing.banner_url,
        duration_minutes: dto.durationMinutes ?? existing.duration_minutes,
        lead_time_hours: dto.leadTimeHours ?? existing.lead_time_hours,
        cancellation_policy: dto.cancellationPolicy ?? existing.cancellation_policy,
        cancellation_cutoff_hours: dto.cancellationCutoffHours ?? existing.cancellation_cutoff_hours,
        reschedule_cutoff_hours: dto.rescheduleCutoffHours ?? existing.reschedule_cutoff_hours,
        status: dto.status ?? existing.status,
        is_featured: dto.isFeatured ?? existing.is_featured,
        updated_at: new Date()
      }
    });

    return updated;
  }

  async adminSetPoojaStatus(poojaId: string, status: string) {
    const existing = await prisma.poojas.findUnique({
      where: { pooja_id: poojaId }
    });

    if (!existing) {
      throw new NotFoundError('Pooja not found', 'POOJA_NOT_FOUND');
    }

    const updated = await prisma.poojas.update({
      where: { pooja_id: poojaId },
      data: { status, updated_at: new Date() }
    });

    return updated;
  }

  async adminCreatePackage(poojaId: string, dto: CreatePoojaPackageDto) {
    return prisma.pooja_packages.create({
      data: {
        pooja_id: poojaId,
        title: dto.title,
        description: dto.description,
        price: dto.price,
        discount_price: dto.discountPrice,
        currency: dto.currency ?? 'INR',
        duration_minutes: dto.durationMinutes ?? 60,
        max_devotees: dto.maxDevotees ?? 4,
        samagri_included: dto.samagriIncluded ?? true,
        priest_level: dto.priestLevel ?? 'SENIOR_ACHARYA',
        delivery_mode: dto.deliveryMode ?? 'ONLINE'
      }
    });
  }

  async adminUpdatePackage(packageId: string, dto: UpdatePoojaPackageDto) {
    const pkg = await prisma.pooja_packages.findUnique({
      where: { package_id: packageId }
    });

    if (!pkg) {
      throw new NotFoundError('Package not found', 'PACKAGE_NOT_FOUND');
    }

    return prisma.pooja_packages.update({
      where: { package_id: packageId },
      data: {
        title: dto.title ?? pkg.title,
        description: dto.description ?? pkg.description,
        price: dto.price !== undefined ? dto.price : pkg.price,
        discount_price: dto.discountPrice !== undefined ? dto.discountPrice : pkg.discount_price,
        duration_minutes: dto.durationMinutes ?? pkg.duration_minutes,
        max_devotees: dto.maxDevotees ?? pkg.max_devotees,
        samagri_included: dto.samagriIncluded !== undefined ? dto.samagriIncluded : pkg.samagri_included,
        priest_level: dto.priestLevel ?? pkg.priest_level,
        delivery_mode: dto.deliveryMode ?? pkg.delivery_mode,
        is_active: dto.isActive !== undefined ? dto.isActive : pkg.is_active
      }
    });
  }

  async adminDeletePackage(packageId: string) {
    await prisma.pooja_packages.delete({
      where: { package_id: packageId }
    });
    return { message: 'Package deleted successfully' };
  }

  async adminCreateAddon(poojaId: string, dto: CreatePoojaAddonDto) {
    return prisma.pooja_addons.create({
      data: {
        pooja_id: poojaId,
        title: dto.title,
        description: dto.description,
        price: dto.price,
        max_quantity: dto.maxQuantity ?? 10
      }
    });
  }

  async adminUpdateAddon(addonId: string, dto: UpdatePoojaAddonDto) {
    const addon = await prisma.pooja_addons.findUnique({
      where: { addon_id: addonId }
    });

    if (!addon) {
      throw new NotFoundError('Addon not found', 'ADDON_NOT_FOUND');
    }

    return prisma.pooja_addons.update({
      where: { addon_id: addonId },
      data: {
        title: dto.title ?? addon.title,
        description: dto.description ?? addon.description,
        price: dto.price !== undefined ? dto.price : addon.price,
        max_quantity: dto.maxQuantity ?? addon.max_quantity,
        is_active: dto.isActive !== undefined ? dto.isActive : addon.is_active
      }
    });
  }

  async adminDeleteAddon(addonId: string) {
    await prisma.pooja_addons.delete({
      where: { addon_id: addonId }
    });
    return { message: 'Add-on deleted successfully' };
  }

  async adminBulkCreateSlots(poojaId: string, dto: BulkCreateSlotsDto) {
    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);
    const createdSlots = [];

    const current = new Date(start);
    while (current <= end) {
      const dateCopy = new Date(current);
      try {
        const slot = await prisma.pooja_slots.upsert({
          where: {
            pooja_id_slot_date_start_time_end_time: {
              pooja_id: poojaId,
              slot_date: dateCopy,
              start_time: dto.startTime,
              end_time: dto.endTime
            }
          },
          update: {
            max_capacity: dto.maxCapacity ?? 5,
            is_active: true
          },
          create: {
            pooja_id: poojaId,
            slot_date: dateCopy,
            start_time: dto.startTime,
            end_time: dto.endTime,
            max_capacity: dto.maxCapacity ?? 5,
            timezone: dto.timezone ?? 'Asia/Kolkata',
            status: 'AVAILABLE'
          }
        });
        createdSlots.push(slot);
      } catch {
        // Skip duplicate or constraint errors in bulk creation
      }
      current.setDate(current.getDate() + 1);
    }

    return {
      poojaId,
      createdCount: createdSlots.length,
      message: `Created / updated ${createdSlots.length} slots`
    };
  }

  async adminListBookings(query: BookingFilterQuery) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(50, Math.max(1, query.limit || 10));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.poojaId) where.pooja_id = query.poojaId;
    if (query.priestId) where.priest_id = query.priestId;

    const [total, bookings] = await Promise.all([
      prisma.pooja_bookings.count({ where }),
      prisma.pooja_bookings.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          poojas: { select: { title: true, temple_name: true } },
          users: { select: { full_name: true, mobile_no: true, email: true } },
          pooja_slots: true,
          priests: { select: { name: true, phone: true } }
        }
      })
    ]);

    return {
      bookings: bookings.map(b => ({
        bookingId: b.booking_id,
        bookingNumber: b.booking_number,
        customerName: b.users.full_name,
        customerMobile: b.users.mobile_no,
        poojaTitle: b.poojas.title,
        deliveryMode: b.delivery_mode,
        status: b.status,
        slotDate: b.pooja_slots.slot_date.toISOString().split('T')[0],
        startTime: b.pooja_slots.start_time,
        priestName: b.priests?.name,
        priceSnapshot: b.price_snapshot,
        createdAt: b.created_at
      })),
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) }
    };
  }

  async adminAssignPriest(bookingId: string, priestId: string, adminUserId: bigint) {
    const booking = await prisma.pooja_bookings.findUnique({
      where: { booking_id: bookingId }
    });

    if (!booking) {
      throw new NotFoundError('Booking not found', 'BOOKING_NOT_FOUND');
    }

    const priest = await prisma.priests.findUnique({
      where: { priest_id: priestId }
    });

    if (!priest) {
      throw new NotFoundError('Priest not found', 'PRIEST_NOT_FOUND');
    }

    await prisma.$transaction(async (tx) => {
      await tx.pooja_bookings.update({
        where: { booking_id: bookingId },
        data: {
          priest_id: priestId,
          updated_at: new Date()
        }
      });

      await tx.pooja_booking_audit.create({
        data: {
          booking_id: bookingId,
          from_status: booking.status,
          to_status: booking.status,
          actor_id: adminUserId,
          actor_role: 'ADMIN',
          reason: `Priest ${priest.name} assigned by administrator`
        }
      });
    });

    return {
      bookingId,
      priestId,
      priestName: priest.name,
      message: 'Priest assigned successfully'
    };
  }

  async adminUpdateBookingStatus(bookingId: string, status: string, adminUserId: bigint, reason?: string) {
    const booking = await prisma.pooja_bookings.findUnique({
      where: { booking_id: bookingId }
    });

    if (!booking) {
      throw new NotFoundError('Booking not found', 'BOOKING_NOT_FOUND');
    }

    await prisma.$transaction(async (tx) => {
      await tx.pooja_bookings.update({
        where: { booking_id: bookingId },
        data: {
          status,
          updated_at: new Date()
        }
      });

      await tx.pooja_booking_audit.create({
        data: {
          booking_id: bookingId,
          from_status: booking.status,
          to_status: status,
          actor_id: adminUserId,
          actor_role: 'ADMIN',
          reason: reason ?? `Status updated to ${status} by admin`
        }
      });
    });

    return {
      bookingId,
      status,
      message: `Booking status updated to ${status}`
    };
  }

  async adminSetLiveSession(bookingId: string, liveStreamUrl: string, notes?: string, adminUserId?: bigint) {
    const booking = await prisma.pooja_bookings.findUnique({
      where: { booking_id: bookingId }
    });

    if (!booking) {
      throw new NotFoundError('Booking not found', 'BOOKING_NOT_FOUND');
    }

    const updated = await prisma.pooja_bookings.update({
      where: { booking_id: bookingId },
      data: {
        live_stream_url: liveStreamUrl,
        live_stream_notes: notes,
        updated_at: new Date()
      }
    });

    return updated;
  }

  async adminProcessRefund(bookingId: string, refundAmount: number, adminUserId: bigint, reason?: string) {
    const booking = await prisma.pooja_bookings.findUnique({
      where: { booking_id: bookingId }
    });

    if (!booking) {
      throw new NotFoundError('Booking not found', 'BOOKING_NOT_FOUND');
    }

    await prisma.$transaction(async (tx) => {
      await tx.pooja_bookings.update({
        where: { booking_id: bookingId },
        data: {
          refund_amount: refundAmount,
          refund_status: 'REFUNDED',
          status: 'REFUNDED',
          updated_at: new Date()
        }
      });

      await tx.pooja_booking_audit.create({
        data: {
          booking_id: bookingId,
          from_status: booking.status,
          to_status: 'REFUNDED',
          actor_id: adminUserId,
          actor_role: 'ADMIN',
          reason: reason ?? `Refund of INR ${refundAmount} processed by admin`
        }
      });
    });

    return {
      bookingId,
      refundAmount,
      refundStatus: 'REFUNDED',
      message: 'Refund recorded and processed'
    };
  }

  async adminGetBookingAudit(bookingId: string) {
    return prisma.pooja_booking_audit.findMany({
      where: { booking_id: bookingId },
      orderBy: { created_at: 'desc' },
      include: {
        users: {
          select: {
            user_id: true,
            full_name: true,
            mobile_no: true
          }
        }
      }
    });
  }
}

export const poojaService = new PoojaService();
