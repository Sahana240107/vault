const express = require('express');
const router  = express.Router();
const protect = require('../middleware/auth.middleware');
const {
  createVault, getMyVaults, getMembers,
  inviteMember, changeMemberRole, removeMember, deleteVault,
} = require('../controllers/vault.controller');

router.post('/',                  protect, createVault);
router.get('/my',                 protect, getMyVaults);
router.delete('/:id',             protect, deleteVault);          // ← must be before /:id/member/:uid
router.get('/:id/members',        protect, getMembers);
router.post('/:id/invite',        protect, inviteMember);
router.put('/:id/member/:uid',    protect, changeMemberRole);
router.delete('/:id/member/:uid', protect, removeMember);

module.exports = router;