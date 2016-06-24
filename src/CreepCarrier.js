/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('harvester'); // -> 'a thing'
 */
console.log('carrier role lives!');

var Cache = require('Cache');
var ACTIONS = {
    HARVEST: 1,
    DEPOSIT: 2
};
var DEPOSIT_FOR = {
    CONSTRUCTION: 1,
    POPULATION: 2
}

function CreepCarrier(creep, depositManager, resourceManager, constructionsManager) {
    //console.log('carrier function!');
    this.cache = new Cache();
    this.creep = creep;
    this.depositManager = depositManager;
    this.resourceManager = resourceManager;
    this.constructionsManager = constructionsManager;
    this.resource = false;
    this.target = false;
};

CreepCarrier.prototype.init = function() {
    //console.log('carrier init!');

    this.remember('role', 'CreepCarrier');
    this.depositFor = this.remember('depositFor') || 2;

    if(this.creep.fatigue != 0) {
        return;
    }

    if(!this.remember('source')) {
        var src = this.resourceManager.getAvailableResource();
        this.remember('source', src.id);
    } else {
        this.resource = this.resourceManager.getResourceById(this.remember('source'));
    }

    if(!this.remember('srcRoom')) {
        this.remember('srcRoom', this.creep.room.name);
    }

    if(this.moveToNewRoom() == true) {
        return;
    }

    if(this.randomMovement() == false) {
        this.act();
    }
};

CreepCarrier.prototype.onRandomMovement = function() {
    //TODO: check when this function is called
    //console.log('carrier onRandomMovement!');

    this.remember('last-action', ACTIONS.DEPOSIT);
}

CreepCarrier.prototype.setDepositFor = function(type) {
    //console.log('carrier setDepositFor!');
    this.remember('depositFor', type);
}
CreepCarrier.prototype.getDepositFor = function() {
    //TODO: check when this function is called
    //console.log('carrier getDepositFor!');
    return this.remember('depositFor');
}

CreepCarrier.prototype.act = function() {
    //console.log('carrier act!');
    var continueDeposit = false;
    if(this.creep.energy != 0 && this.remember('last-action') == ACTIONS.DEPOSIT) {
        continueDeposit = true;
    }

    if(this.creep.energy < this.creep.energyCapacity && continueDeposit == false) {
        if(this.pickupEnergy()) {
            return;
        }
        this.harvestEnergy();
    } else {
        this.depositEnergy();
    }
};

CreepCarrier.prototype.depositEnergy = function() {
    //console.log('carrier depositEnergy!');
    var avoidArea = this.getAvoidedArea();

    if(this.depositManager.getEmptyDeposits().length == 0 && this.depositManager.getSpawnDeposit().energy == this.depositManager.getSpawnDeposit().energyCapacity) {
        this.depositFor = DEPOSIT_FOR.CONSTRUCTION;
    }

    if(this.depositManager.energy() / this.depositManager.energyCapacity() < 0.3) {
        this.depositFor = DEPOSIT_FOR.POPULATION;
    }

    if(this.depositFor == DEPOSIT_FOR.POPULATION) {
        var deposit = this.getDeposit();
        this.creep.moveTo(deposit);
        this.creep.transfer(deposit, RESOURCE_ENERGY);
    }

    if(this.depositFor == DEPOSIT_FOR.CONSTRUCTION) {
        var worker = this.getWorker();
        var range = 1;
        if(!worker) {
            this.remember('target-worker', false);
            worker = this.constructionsManager.controller;
            range = 2;
        }

        if(!this.creep.pos.isNearTo(worker, range)) {
            this.creep.moveTo(worker);
        } else {
            this.remember('move-attempts', 0);
        }
        this.harvest();
    }

    this.remember('last-action', ACTIONS.DEPOSIT);
}

CreepCarrier.prototype.getWorker = function() {
    //TODO: check when this function is called
    //console.log('carrier getWorker!');
    if(this.remember('target-worker')) {
        return Game.getObjectById(this.remember('target-worker'));
    }

    return false;
}
CreepCarrier.prototype.getDeposit = function() {
    //console.log('carrier getDeposit!');
    return this.cache.remember(
        'selected-deposit',
        function() {
            var deposit = false;

            // Deposit energy
            if(this.remember('closest-deposit')) {
                deposit = this.depositManager.getEmptyDepositOnId(this.remember('closest-deposit'));
            }

            if(!deposit) {
                deposit = this.depositManager.getClosestEmptyDeposit(this.creep);
                this.remember('closest-deposit', deposit.id);
            }

            if(!deposit) {
                deposit = this.depositManager.getSpawnDeposit();
            }

            return deposit;
        }.bind(this)
    )
};
CreepCarrier.prototype.pickupEnergy = function() {
    //console.log('carrier pickupEnergy!');
    var avoidArea = this.getAvoidedArea();
    if(this.creep.energy == this.creep.energyCapacity) {
        return false;
    }

    var targets = this.creep.pos.findInRange(FIND_DROPPED_ENERGY, 3);
    if(targets.length) {
        var target = this.creep.pos.findClosestByPath(targets);
        this.creep.moveTo(target);
        this.creep.pickup(target);
        return true;
    }
};
CreepCarrier.prototype.harvestEnergy = function() {
    //console.log('carrier harvestEnergy!');
    //this.creep.moveTo(0,0);
    var avoidArea = this.getAvoidedArea();

    this.creep.moveTo(this.resource);
    if(this.creep.pos.inRangeTo(this.resource, 3)) {
        this.harvest();
    }
    this.remember('last-action', ACTIONS.HARVEST);
    this.forget('closest-deposit');
}

CreepCarrier.prototype.harvest = function() {
    //console.log('carrier harvest!');
    var creepsNear = this.creep.pos.findInRange(FIND_MY_CREEPS, 1);
    if(creepsNear.length){
        for(var n in creepsNear){
            if(creepsNear[n].memory.role === 'CreepMiner' && creepsNear[n].energy != 0){
                creepsNear[n].transfer(this.creep, RESOURCE_ENERGY);
            }
            if(creepsNear[n].memory.role === 'CreepBuilder'){
                this.creep.transfer(creepsNear[n], RESOURCE_ENERGY)
            }
        }
    }
}

module.exports = CreepCarrier;
