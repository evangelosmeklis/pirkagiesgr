// Database management for historical fire data
class FireDatabase {
    constructor() {
        this.dbName = 'GreeceFires';
        this.version = 1;
        this.db = null;
        this.init();
    }

    async init() {
        try {
            this.db = await this.openDatabase();
            console.log('Database initialized successfully');
        } catch (error) {
            console.error('Failed to initialize database:', error);
        }
    }

    openDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => {
                reject(new Error('Failed to open database'));
            };

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Create fires table if it doesn't exist
                if (!db.objectStoreNames.contains('fires')) {
                    const firesStore = db.createObjectStore('fires', { 
                        keyPath: 'id',
                        autoIncrement: true 
                    });
                    
                    // Create indexes for efficient querying
                    firesStore.createIndex('latitude', 'latitude', { unique: false });
                    firesStore.createIndex('longitude', 'longitude', { unique: false });
                    firesStore.createIndex('acq_date', 'acq_date', { unique: false });
                    firesStore.createIndex('confidence', 'confidence', { unique: false });
                    firesStore.createIndex('satellite', 'satellite', { unique: false });
                    firesStore.createIndex('brightness', 'brightness', { unique: false });
                    firesStore.createIndex('frp', 'frp', { unique: false });
                    firesStore.createIndex('status', 'status', { unique: false });
                    firesStore.createIndex('unique_key', 'unique_key', { unique: true });
                }
            };
        });
    }

    async addFire(fireData) {
        if (!this.db) {
            await this.init();
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['fires'], 'readwrite');
            const store = transaction.objectStore('fires');
            
            // Create unique key based on coordinates, date, and time
            const uniqueKey = `${fireData.latitude}_${fireData.longitude}_${fireData.acq_date}_${fireData.acq_time}`;
            fireData.unique_key = uniqueKey;
            fireData.status = fireData.status || 'active';
            fireData.created_at = new Date().toISOString();
            
            const request = store.add(fireData);
            
            request.onsuccess = () => {
                resolve(request.result);
            };
            
            request.onerror = () => {
                // If error is due to duplicate unique key, that's okay
                if (request.error.name === 'ConstraintError') {
                    resolve(null); // Fire already exists
                } else {
                    reject(request.error);
                }
            };
        });
    }

    async bulkAddFires(firesArray) {
        if (!this.db) {
            await this.init();
        }

        const results = [];
        for (const fire of firesArray) {
            try {
                const result = await this.addFire(fire);
                if (result) {
                    results.push(result);
                }
            } catch (error) {
                console.warn('Failed to add fire:', error);
            }
        }
        return results;
    }

    async getAllFires() {
        if (!this.db) {
            await this.init();
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['fires'], 'readonly');
            const store = transaction.objectStore('fires');
            const request = store.getAll();
            
            request.onsuccess = () => {
                resolve(request.result);
            };
            
            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    async getFiresByDateRange(startDate, endDate) {
        if (!this.db) {
            await this.init();
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['fires'], 'readonly');
            const store = transaction.objectStore('fires');
            const index = store.index('acq_date');
            
            const range = IDBKeyRange.bound(startDate, endDate);
            const request = index.getAll(range);
            
            request.onsuccess = () => {
                resolve(request.result);
            };
            
            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    async getFiresByConfidence(minConfidence) {
        if (!this.db) {
            await this.init();
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['fires'], 'readonly');
            const store = transaction.objectStore('fires');
            const index = store.index('confidence');
            
            const range = IDBKeyRange.lowerBound(minConfidence);
            const request = index.getAll(range);
            
            request.onsuccess = () => {
                resolve(request.result);
            };
            
            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    async updateFireStatus(fireId, status) {
        if (!this.db) {
            await this.init();
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['fires'], 'readwrite');
            const store = transaction.objectStore('fires');
            
            const getRequest = store.get(fireId);
            getRequest.onsuccess = () => {
                const fire = getRequest.result;
                if (fire) {
                    fire.status = status;
                    fire.updated_at = new Date().toISOString();
                    
                    const updateRequest = store.put(fire);
                    updateRequest.onsuccess = () => {
                        resolve(updateRequest.result);
                    };
                    updateRequest.onerror = () => {
                        reject(updateRequest.error);
                    };
                } else {
                    reject(new Error('Fire not found'));
                }
            };
            
            getRequest.onerror = () => {
                reject(getRequest.error);
            };
        });
    }

    async getFireStats() {
        if (!this.db) {
            await this.init();
        }

        const allFires = await this.getAllFires();
        const now = new Date();
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const stats = {
            total: allFires.length,
            thisWeek: 0,
            thisMonth: 0,
            highConfidence: 0,
            mediumConfidence: 0,
            lowConfidence: 0,
            avgBrightness: 0,
            avgFrp: 0,
            byMonth: {},
            bySatellite: {}
        };

        let totalBrightness = 0;
        let totalFrp = 0;

        allFires.forEach(fire => {
            const fireDate = new Date(fire.acq_date);
            
            // Time-based stats
            if (fireDate >= oneWeekAgo) stats.thisWeek++;
            if (fireDate >= oneMonthAgo) stats.thisMonth++;

            // Confidence stats
            if (fire.confidence >= 80) stats.highConfidence++;
            else if (fire.confidence >= 50) stats.mediumConfidence++;
            else stats.lowConfidence++;

            // Average calculations
            totalBrightness += parseFloat(fire.brightness) || 0;
            totalFrp += parseFloat(fire.frp) || 0;

            // Monthly distribution
            const monthKey = fireDate.toISOString().substring(0, 7); // YYYY-MM
            stats.byMonth[monthKey] = (stats.byMonth[monthKey] || 0) + 1;

            // Satellite distribution
            stats.bySatellite[fire.satellite] = (stats.bySatellite[fire.satellite] || 0) + 1;
        });

        stats.avgBrightness = stats.total > 0 ? (totalBrightness / stats.total).toFixed(2) : 0;
        stats.avgFrp = stats.total > 0 ? (totalFrp / stats.total).toFixed(2) : 0;

        return stats;
    }

    async searchFires(query) {
        if (!this.db) {
            await this.init();
        }

        const allFires = await this.getAllFires();
        const searchTerm = query.toLowerCase();

        return allFires.filter(fire => {
            return (
                fire.satellite?.toLowerCase().includes(searchTerm) ||
                fire.instrument?.toLowerCase().includes(searchTerm) ||
                fire.acq_date?.includes(searchTerm) ||
                fire.confidence?.toString().includes(searchTerm)
            );
        });
    }

    async clearOldFires(daysToKeep = 365) {
        if (!this.db) {
            await this.init();
        }

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
        const cutoffString = cutoffDate.toISOString().substring(0, 10);

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['fires'], 'readwrite');
            const store = transaction.objectStore('fires');
            const index = store.index('acq_date');
            
            const range = IDBKeyRange.upperBound(cutoffString, true);
            const request = index.openCursor(range);
            
            let deletedCount = 0;
            
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    cursor.delete();
                    deletedCount++;
                    cursor.continue();
                } else {
                    resolve(deletedCount);
                }
            };
            
            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    async exportData() {
        const allFires = await this.getAllFires();
        const dataStr = JSON.stringify(allFires, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `greece-fires-${new Date().toISOString().substring(0, 10)}.json`;
        link.click();
        
        URL.revokeObjectURL(url);
    }

    async importData(fileContent) {
        try {
            const data = JSON.parse(fileContent);
            if (Array.isArray(data)) {
                return await this.bulkAddFires(data);
            } else {
                throw new Error('Invalid data format');
            }
        } catch (error) {
            throw new Error('Failed to import data: ' + error.message);
        }
    }
}

// Create global database instance
window.fireDB = new FireDatabase();
