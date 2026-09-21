import { Request, Response } from 'express';
import crypto from 'crypto';
import prisma from '../prisma/client';
import QRCode from 'qrcode';
import { emitTableUpdate, emitTableDelete } from '../socket';

export const getTables = async (req: Request, res: Response): Promise<void> => {
  try {
    const tables = await prisma.restaurantTable.findMany({
      orderBy: { tableNumber: 'asc' }
    });
    res.json(tables);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching tables' });
  }
};

export const createTable = async (req: Request, res: Response): Promise<void> => {
  try {
    const { tableNumber, capacity } = req.body;

    let targetTableNumber: number;

    if (tableNumber) {
      targetTableNumber = Number(tableNumber);
      const existingTable = await prisma.restaurantTable.findUnique({
        where: { tableNumber: targetTableNumber },
      });

      if (existingTable) {
        res.status(400).json({ message: `Table ${targetTableNumber} already exists` });
        return;
      }
    } else {
      // Find highest existing dining table number (< 900) and increment by 1
      const maxTable = await prisma.restaurantTable.findFirst({
        where: { tableNumber: { lt: 900 } },
        orderBy: { tableNumber: 'desc' },
      });
      targetTableNumber = maxTable ? maxTable.tableNumber + 1 : 1;
    }

    const newTable = await prisma.restaurantTable.create({
      data: {
        tableNumber: targetTableNumber,
        capacity: Number(capacity || 4),
        qrCodeToken: `tbl-token-${targetTableNumber}-${crypto.randomUUID()}`,
      },
    });

    emitTableUpdate(newTable);

    res.status(201).json(newTable);
  } catch (error) {
    console.error("Error creating table:", error);
    res.status(500).json({ message: 'Error creating table' });
  }
};

export const updateTableStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body;

    const updated = await prisma.restaurantTable.update({
      where: { id },
      data: { status },
    });

    emitTableUpdate(updated);

    res.json(updated);
  } catch (error) {
    console.error("Error updating table status:", error);
    res.status(500).json({ message: 'Error updating table status' });
  }
};

export const deleteTable = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);
    await prisma.restaurantTable.delete({ where: { id } });

    emitTableDelete(id);

    res.json({ message: 'Table deleted successfully' });
  } catch (error) {
    res.status(400).json({ message: 'Cannot delete table with existing order history' });
  }
};

export const generateQR = async (req: Request, res: Response): Promise<void> => {
  try {
    const rawParam = String(req.params.tableNumber);
    const isTakeaway = rawParam.toLowerCase() === 'takeaway';
    const host = req.headers.host ? req.headers.host.split(':')[0] : 'localhost';
    const clientHost = host === 'localhost' || host === '127.0.0.1' ? (process.env.CLIENT_HOST || '192.168.100.253') : host;
    const customerUrl = isTakeaway
      ? `http://${clientHost}:5173/menu?takeaway=true`
      : `http://${clientHost}:5173/menu?table=${Number(rawParam)}`;
    
    // Generate the QR code as a base64 Data URL
    const qrCodeImage = await QRCode.toDataURL(customerUrl, {
      width: 400,
      margin: 2,
      color: {
        dark: '#0f172a', // Dark slate color for the QR code
        light: '#ffffff'
      }
    });

    res.json({ qrCode: qrCodeImage, url: customerUrl });
  } catch (error) {
    res.status(500).json({ message: 'Error generating QR code' });
  }
};