import type mysql from 'mysql2/promise';

let pool: mysql.Pool | null = null;
let destinationPool: mysql.Pool | null = null;

export const setPool = (p: mysql.Pool | null) => {
  pool = p;
};

export const getPool = () => pool;

export const setDestinationPool = (p: mysql.Pool | null) => {
  destinationPool = p;
};

export const getDestinationPool = () => destinationPool;
